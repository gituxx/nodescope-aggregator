#!/usr/bin/env node
// NodeScope verifier: collects every configured public source, tests each node through a real
// proxy core (mihomo) and publishes only nodes that actually relay traffic.
//
//   node scripts/verify.mjs --mihomo ./mihomo --out ./results [--limit 40000]
//
// Phase 1: mihomo URL test (full protocol handshake + HTTP request) for every candidate.
// Phase 2: for survivors, fetch Cloudflare's /cdn-cgi/trace *through* the node to confirm it a
//          second time and learn the real exit IP / exit country.
// History of the last runs is kept in <out>/history.json and turned into a stability score.
import { spawn, execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { collectCandidates } from "../lib/feed.js";
import { buildVerifiedSnapshot, nodeKey, pruneHistory, setUriLabel, updateHistory } from "../lib/verify.js";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), list[index + 1]?.startsWith("--") ? "true" : list[index + 1]]);
  return pairs;
}, []));

const MIHOMO = resolve(args.mihomo || "./mihomo");
const OUT = resolve(args.out || "./results");
const LIMIT = Number(args.limit || 40000);
const TEST_URL = args["test-url"] || "https://www.gstatic.com/generate_204";
const TRACE_URL = "https://cloudflare.com/cdn-cgi/trace";
const PHASE1_CHUNK = 3000;
const PHASE1_CONCURRENCY = Number(args.concurrency || 160);
const PHASE1_TIMEOUT_MS = 6000;
const PHASE2_CHUNK = 300;
const PHASE2_CONCURRENCY = 48;
const MAX_LATENCY_MS = 4000;
const CONTROLLER_PORT = 19190;
const LISTENER_BASE_PORT = 30000;
const MIN_PUBLISH = 30;
const MIN_RATIO_OF_PREVIOUS = 0.3;

const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function pool(items, concurrency, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}

async function withMihomo(name, config, providerLines, task) {
  const dir = join(tmpdir(), `nodescope-${name}-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "provider.txt"), providerLines.join("\n"));
  writeFileSync(join(dir, "config.yaml"), config);
  const child = spawn(MIHOMO, ["-d", dir, "-f", join(dir, "config.yaml")], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  const exited = new Promise((done) => child.on("exit", done));
  try {
    const started = Date.now();
    while (true) {
      try {
        const response = await fetch(`http://127.0.0.1:${CONTROLLER_PORT}/providers/proxies/p`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          const provider = await response.json();
          return await task(new Set((provider.proxies || []).map((proxy) => proxy.name)));
        }
      } catch { /* not ready yet */ }
      if (child.exitCode !== null || Date.now() - started > 60000) throw new Error(`mihomo failed to start: ${stderr}`);
      await sleep(300);
    }
  } finally {
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

const baseConfig = `external-controller: 127.0.0.1:${CONTROLLER_PORT}
log-level: silent
ipv6: true
unified-delay: true
tcp-concurrent: true
proxy-providers:
  p:
    type: file
    path: ./provider.txt
    health-check: { enable: false }
`;

async function healthcheck(name, timeout = PHASE1_TIMEOUT_MS) {
  try {
    const url = `http://127.0.0.1:${CONTROLLER_PORT}/providers/proxies/p/${encodeURIComponent(name)}/healthcheck`
      + `?timeout=${timeout}&url=${encodeURIComponent(TEST_URL)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout + 4000) });
    if (!response.ok) return null;
    const { delay } = await response.json();
    return Number.isFinite(delay) && delay > 0 && delay <= MAX_LATENCY_MS ? delay : null;
  } catch {
    return null;
  }
}

function trace(port) {
  return new Promise((done) => {
    execFile("curl", ["-s", "-m", "10", "-x", `http://127.0.0.1:${port}`, TRACE_URL], { timeout: 12000 }, (error, stdout) => {
      if (error) return done(null);
      const countryCode = stdout.match(/^loc=([A-Z]{2})$/m)?.[1] || null;
      const ip = stdout.match(/^ip=(\S+)$/m)?.[1] || null;
      done(ip ? { countryCode, ip } : null);
    });
  });
}

async function phase1(candidates) {
  const delays = new Map();
  for (let start = 0; start < candidates.length; start += PHASE1_CHUNK) {
    const chunk = candidates.slice(start, start + PHASE1_CHUNK);
    const lines = [];
    for (const [offset, node] of chunk.entries()) {
      const tagged = setUriLabel(node.raw, `n${start + offset}`);
      if (tagged) lines.push(tagged);
    }
    const config = `${baseConfig}proxy-groups:\n  - { name: all, type: select, use: [p] }\nrules:\n  - MATCH,DIRECT\n`;
    await withMihomo("p1", config, lines, async (loaded) => {
      await pool([...loaded], PHASE1_CONCURRENCY, async (name) => {
        const delay = await healthcheck(name);
        if (delay) delays.set(Number(name.slice(1)), delay);
      });
      log(`phase1 ${Math.min(start + PHASE1_CHUNK, candidates.length)}/${candidates.length} loaded=${loaded.size} alive=${delays.size}`);
    });
  }
  return delays;
}

async function phase2(candidates, delays) {
  const results = new Map();
  const alive = [...delays.keys()];
  for (let start = 0; start < alive.length; start += PHASE2_CHUNK) {
    const chunk = alive.slice(start, start + PHASE2_CHUNK);
    const lines = chunk.map((index) => setUriLabel(candidates[index].raw, `n${index}`));
    const groups = chunk.map((index, slot) => `  - { name: g${slot}, type: select, use: [p], filter: "^n${index}$" }`).join("\n");
    const listeners = chunk.map((_, slot) => `  - { name: l${slot}, type: mixed, listen: 127.0.0.1, port: ${LISTENER_BASE_PORT + slot}, proxy: g${slot} }`).join("\n");
    const config = `${baseConfig}proxy-groups:\n${groups}\nlisteners:\n${listeners}\nrules:\n  - MATCH,DIRECT\n`;
    await withMihomo("p2", config, lines, async (loaded) => {
      await pool(chunk.map((index, slot) => [index, slot]), PHASE2_CONCURRENCY, async ([index, slot]) => {
        if (!loaded.has(`n${index}`)) return;
        let exit = await trace(LISTENER_BASE_PORT + slot);
        // A failed trace gets one more chance via a second URL test before the node is dropped.
        const second = exit ? null : await healthcheck(`n${index}`, 8000);
        if (!exit && !second) {
          results.set(index, { ok: false });
          return;
        }
        const latencyMs = second ? Math.round((delays.get(index) + second) / 2) : delays.get(index);
        results.set(index, { ok: true, latencyMs, exit });
      });
    });
    log(`phase2 ${Math.min(start + PHASE2_CHUNK, alive.length)}/${alive.length} ok=${[...results.values()].filter((item) => item.ok).length}`);
  }
  return results;
}

async function main() {
  const startedAt = Date.now();
  if (!existsSync(MIHOMO)) throw new Error(`mihomo binary not found at ${MIHOMO}`);
  mkdirSync(OUT, { recursive: true });
  const previous = readJson(join(OUT, "snapshot.json"), null);
  const history = readJson(join(OUT, "history.json"), {});

  log("collecting sources…");
  const collected = await collectCandidates({ limit: LIMIT });
  const failedSources = collected.sources.filter((source) => source.error);
  log(`candidates=${collected.nodes.length} sources=${collected.sources.length} failedSources=${failedSources.length}`);
  for (const source of failedSources) log(`  source error: ${source.name}: ${source.error}`);

  const delays = await phase1(collected.nodes);
  const results = await phase2(collected.nodes, delays);
  const passed = [...results.values()].filter((item) => item.ok).length;
  log(`passed=${passed} handshake=${delays.size} candidates=${collected.nodes.length}`);

  const previousPassed = previous?.verification?.passed || 0;
  const minimum = Math.max(MIN_PUBLISH, Math.floor(previousPassed * MIN_RATIO_OF_PREVIOUS));
  if (passed < minimum) {
    // Most likely a runner network problem; keep the previous snapshot and history untouched.
    throw new Error(`only ${passed} nodes passed (minimum ${minimum}); refusing to publish`);
  }

  const generatedAt = new Date().toISOString();
  for (const [index, node] of collected.nodes.entries()) {
    const result = results.get(index);
    updateHistory(history, nodeKey(node.identity), Boolean(result?.ok), result?.latencyMs ?? null, generatedAt);
  }
  pruneHistory(history);

  const stats = {
    runner: process.env.GITHUB_ACTIONS ? "github-actions" : "local",
    testUrl: TEST_URL,
    candidates: collected.nodes.length,
    handshakeOk: delays.size,
    passed,
    traced: [...results.values()].filter((item) => item.ok && item.exit?.countryCode).length,
    durationSec: Math.round((Date.now() - startedAt) / 1000),
  };
  const snapshot = buildVerifiedSnapshot({ collected, results, history, generatedAt, stats });
  writeFileSync(join(OUT, "snapshot.json"), JSON.stringify(snapshot));
  writeFileSync(join(OUT, "history.json"), JSON.stringify(history));
  const plain = `${snapshot.nodes.map((node) => node.raw).join("\n")}\n`;
  writeFileSync(join(OUT, "nodes.txt"), plain);
  writeFileSync(join(OUT, "nodes.b64"), Buffer.from(plain).toString("base64"));
  writeFileSync(join(OUT, "stats.json"), JSON.stringify({ ...snapshot.verification, sources: collected.sources }, null, 2));
  log(`published ${snapshot.nodes.length} nodes in ${stats.durationSec}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
