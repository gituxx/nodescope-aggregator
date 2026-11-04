// Pure helpers for the GitHub Actions verifier (scripts/verify.mjs).
// Kept free of process/network side effects so they can be unit tested.
import { createHash } from "node:crypto";
import { getCountryName, getRegion, MAX_NODES } from "./feed.js";

export const HISTORY_WINDOW = 16;
export const HISTORY_KEEP_MS = 3 * 24 * 60 * 60 * 1000;
export const VERIFIED_LOCATION_SOURCE = "出口 IP 测试报告";

function toBase64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function fromBase64(text) {
  return Buffer.from(text.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function nodeKey(identity) {
  return createHash("sha1").update(identity).digest("hex").slice(0, 16);
}

export function flagEmoji(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode || "")) return "🌐";
  return String.fromCodePoint(...[...countryCode].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

/** Replace the display label of a node URI without touching its connection parameters. */
export function setUriLabel(uri, label) {
  const scheme = uri.match(/^([a-z0-9+.-]+):\/\//i)?.[1]?.toLowerCase();
  const base = uri.split("#", 1)[0];
  if (scheme === "vmess") {
    try {
      const config = JSON.parse(fromBase64(base.slice(8)));
      config.ps = label;
      return `vmess://${toBase64(JSON.stringify(config))}`;
    } catch {
      return null;
    }
  }
  if (scheme === "ssr") {
    try {
      const decoded = fromBase64(base.slice(6));
      const remarks = Buffer.from(label, "utf8").toString("base64url");
      const [main, query = ""] = decoded.split("/?");
      const params = new URLSearchParams(query);
      params.set("remarks", remarks);
      return `ssr://${Buffer.from(`${main}/?${params}`, "utf8").toString("base64url")}`;
    } catch {
      return null;
    }
  }
  return `${base}#${encodeURIComponent(label)}`;
}

export function updateHistory(history, key, ok, latencyMs, now = new Date().toISOString()) {
  const entry = history[key] || { r: "", t: now };
  entry.r = `${entry.r}${ok ? "1" : "0"}`.slice(-HISTORY_WINDOW);
  entry.t = now;
  if (ok) {
    entry.ok = now;
    entry.l = latencyMs;
  }
  history[key] = entry;
  return entry;
}

export function pruneHistory(history, now = Date.now()) {
  for (const [key, entry] of Object.entries(history)) {
    if (!entry?.t || now - Date.parse(entry.t) > HISTORY_KEEP_MS) delete history[key];
  }
  return history;
}

/** Laplace-smoothed success ratio so a single lucky run does not look perfectly stable. */
export function stabilityOf(entry) {
  const runs = entry?.r || "";
  const ok = [...runs].filter((char) => char === "1").length;
  return { stability: (ok + 1) / (runs.length + 2), observations: runs.length, successes: ok };
}

export const MAX_PER_EXIT_IP = 3;

/** 0–100: stability 50, latency 25, throughput 15, exit trace 5, independent sources 5. */
export function scoreNode({ stability, latencyMs, traced, sourcesCount = 1, speedMbps = null }) {
  const latency = Number.isFinite(latencyMs) ? Math.min(1, Math.max(0, (3000 - latencyMs) / 2700)) : 0;
  const speed = Number.isFinite(speedMbps) && speedMbps > 0 ? Math.min(1, Math.log2(1 + speedMbps) / Math.log2(51)) : 0;
  return Math.round(stability * 50 + latency * 25 + speed * 15 + (traced ? 5 : 0) + Math.min(Math.max(sourcesCount - 1, 0), 4) * 1.25);
}

/**
 * Build the snapshot consumed by the Worker/API from verification results.
 * `results` maps candidate index -> { ok, latencyMs, exit: { countryCode, ip } | null }.
 */
export function buildVerifiedSnapshot({ collected, results, history, generatedAt, stats }) {
  const nodes = [];
  for (const [index, result] of results) {
    if (!result.ok) continue;
    const candidate = collected.nodes[index];
    const key = nodeKey(candidate.identity);
    const { stability, observations } = stabilityOf(history[key]);
    const exitCountry = result.exit?.countryCode && /^[A-Z]{2}$/.test(result.exit.countryCode) && result.exit.countryCode !== "XX"
      ? result.exit.countryCode : null;
    const countryCode = exitCountry || candidate.countryCode || null;
    const label = `${flagEmoji(countryCode)} ${countryCode || "--"} · ${candidate.protocol} · ${key.slice(0, 4)}`;
    const raw = setUriLabel(candidate.raw, label);
    if (!raw) continue;
    nodes.push({
      id: key,
      name: label,
      upstreamName: candidate.name,
      protocol: candidate.protocol,
      server: candidate.server,
      port: candidate.port,
      raw,
      source: candidate.source,
      method: candidate.method,
      sourcesCount: candidate.sourcesCount,
      status: "available",
      statusLabel: "代理实测可用",
      latencyMs: result.latencyMs,
      checkedAt: generatedAt,
      verifiedAt: generatedAt,
      countryCode,
      country: countryCode ? getCountryName(countryCode) : "待识别",
      region: countryCode ? getRegion(countryCode) : null,
      locationSource: exitCountry ? VERIFIED_LOCATION_SOURCE : candidate.locationSource,
      exitIp: result.exit?.ip || null,
      speedMbps: result.speedMbps ?? null,
      clash: result.clash || null,
      stability: Math.round(stability * 100) / 100,
      observations,
      score: scoreNode({ stability, latencyMs: result.latencyMs, traced: Boolean(exitCountry), sourcesCount: candidate.sourcesCount, speedMbps: result.speedMbps }),
    });
  }
  nodes.sort((a, b) => b.score - a.score || a.latencyMs - b.latencyMs);
  // The same backend is often re-published behind many CDN fronts; keep only the best few.
  const perExit = new Map();
  const unique = nodes.filter((node) => {
    const key = node.exitIp ? `${node.exitIp}|${node.protocol}` : `${node.server}:${node.port}|${node.protocol}`;
    const count = perExit.get(key) || 0;
    perExit.set(key, count + 1);
    return count < MAX_PER_EXIT_IP;
  });
  return {
    fetchedAt: generatedAt,
    upstreamGeneratedAt: collected.upstreamGeneratedAt,
    checkedAt: generatedAt,
    stale: false,
    sources: collected.sources,
    verification: { generatedAt, ...stats, exitDuplicatesRemoved: nodes.length - unique.length, published: Math.min(unique.length, MAX_NODES) },
    nodes: unique.slice(0, MAX_NODES),
  };
}
