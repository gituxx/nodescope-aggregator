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

async function startMihomo(name, config, segments) {
  const dir = join(tmpdir(), `nodescope-${name}-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  segments.forEach((lines, index) => writeFileSync(join(dir, `p${index}.txt`), lines.join("\n")));
  writeFileSync(join(dir, "config.yaml"), config);
  const child = spawn(MIHOMO, ["-d", dir, "-f", join(dir, "config.yaml")], { stdio: ["ignore", "ignore", "pipe"] });
  let output = "";
  child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-8000); });
  const exited = new Promise((done) => child.on("exit", done));
  const stop = async () => {
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
    await Promise.race([exited, sleep(2000)]);
    rmSync(dir, { recursive: true, force: true });
  };
  const started = Date.now();
  while (true) {
    try {
      const response = await fetch(`http://127.0.0.1:${CONTROLLER_PORT}/providers/proxies`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const { providers = {} } = await response.json();
        const counts = segments.map((_, index) => providers[`p${index}`]?.proxies?.length || 0);
        const owner = new Map();
        for (const [providerName, provider] of Object.entries(providers)) {
          if (!/^p\d+$/.test(providerName)) continue;
          for (const proxy of provider.proxies || []) owner.set(proxy.name, providerName);
        }
        return { stop, counts, owner };
      }
    } catch { /* not ready yet */ }
    if (child.exitCode !== null || Date.now() - started > 90000) {
      await stop();
      throw new Error(`mihomo failed to start: ${output}`);
    }
    await sleep(250);
  }
}

// mihomo rejects a whole provider when one proxy in it is invalid. Lines are spread over many
// small providers; any provider that loads nothing is halved and retried until the bad line is
// isolated and dropped. `task` receives Map(proxyName -> providerName).
async function withMihomo(name, buildConfig, lines, task, segmentSize = 50) {
  let segments = [];
  for (let index = 0; index < lines.length; index += segmentSize) segments.push(lines.slice(index, index + segmentSize));
  for (let round = 0; round < 12; round += 1) {
    const instance = await startMihomo(name, buildConfig(segments.map((_, index) => `p${index}`)), segments);
    const failed = instance.counts.map((count, index) => count === 0 && segments[index].length > 0);
    if (!failed.some(Boolean) || round === 11) {
      try {
        return await task(instance.owner);
      } finally {
        await instance.stop();
      }
    }
    await instance.stop();
    const next = [];
    segments.forEach((segment, index) => {
      if (!failed[index]) next.push(segment);
      else if (segment.length > 1) {
        const middle = Math.ceil(segment.length / 2);
        next.push(segment.slice(0, middle), segment.slice(middle));
      }
    });
    segments = next;
  }
  return task(new Map());
}

function buildConfig(providers, extra) {
  const providerYaml = providers.map((providerName) => `  ${providerName}: { type: file, path: ./${providerName}.txt, health-check: { enable: false } }`).join("\n");
  return `external-controller: 127.0.0.1:${CONTROLLER_PORT}
log-level: error
ipv6: true
unified-delay: true
tcp-concurrent: true
proxy-providers:
${providerYaml}
${extra(providers)}
rules:
  - MATCH,DIRECT
`;
}

async function healthcheck(provider, name, timeout = PHASE1_TIMEOUT_MS) {
  try {
    const url = `http://127.0.0.1:${CONTROLLER_PORT}/providers/proxies/${provider}/${encodeURIComponent(name)}/healthcheck`
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
    const config = (providers) => buildConfig(providers, (names) => `proxy-groups:\n  - { name: all, type: select, use: [${names.join(", ")}] }`);
    await withMihomo("p1", config, lines, async (loaded) => {
      await pool([...loaded], PHASE1_CONCURRENCY, async ([name, provider]) => {
        const delay = await healthcheck(provider, name);
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
    const listeners = chunk.map((_, slot) => `  - { name: l${slot}, type: mixed, listen: 127.0.0.1, port: ${LISTENER_BASE_PORT + slot}, proxy: g${slot} }`).join("\n");
    const config = (providers) => buildConfig(providers, (names) => {
      const groups = chunk.map((index, slot) => `  - { name: g${slot}, type: select, use: [${names.join(", ")}], filter: "^n${index}$" }`).join("\n");
      return `proxy-groups:\n${groups}\nlisteners:\n${listeners}`;
    });
    await withMihomo("p2", config, lines, async (loaded) => {
      await pool(chunk.map((index, slot) => [index, slot]), PHASE2_CONCURRENCY, async ([index, slot]) => {
        if (!loaded.has(`n${index}`)) return;
        let exit = await trace(LISTENER_BASE_PORT + slot);
        // A failed trace gets one more chance via a second URL test before the node is dropped.
        const second = exit ? null : await healthcheck(loaded.get(`n${index}`), `n${index}`, 8000);
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
