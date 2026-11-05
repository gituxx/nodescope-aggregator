import {
  getCountryCounts,
  getProtocolCounts,
  getStatusCounts,
  getFeedSnapshot,
} from "../../lib/feed.js";
import { mergeProbes, readProbes } from "../../lib/probe.js";
import { buildClashConfig, uriToClash } from "../../lib/clash.js";
import { filterSubscription } from "../../lib/subscription.js";

export { filterSubscription };

const VERIFIED_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

// Stable node id: verifier-provided hash, otherwise FNV-1a of the URI (fallback snapshots).
export function nodeId(node) {
  if (node.id) return node.id;
  let hash = 0x811c9dc5;
  const text = node.raw || `${node.protocol}|${node.server}|${node.port}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `f${hash.toString(16).padStart(8, "0")}`;
}

const headers = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  "X-Content-Type-Options": "nosniff",
};


function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  if (!["nodes", "stats", "node", "subscription"].includes(route)) return json({ error: "API 路径不存在" }, 404);
  let snapshot;
  try {
    snapshot = await getFeedSnapshot(request, env);
  } catch (error) {
    return json({ error: "暂时无法获取上游节点数据", detail: error.message }, 503);
  }

  if (route === "node") {
    // Prefer the stable id so a page opened before a refresh can still copy nodes.
    const id = url.searchParams.get("id");
    let node = id ? snapshot.nodes.find((item) => nodeId(item) === id) : null;
    if (!node && !id) {
      const value = url.searchParams.get("index");
      const index = value && /^\d+$/.test(value) ? Number(value) : -1;
      if (index >= 0 && index < snapshot.nodes.length && url.searchParams.get("version") === snapshot.fetchedAt) node = snapshot.nodes[index];
    }
    if (!node) return json({ error: "节点已下线或已更新，请刷新列表后重试" }, id ? 404 : 409);
    return new Response(node.raw, {
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  }
  const probeState = await readProbes(env);
  const nodes = mergeProbes(snapshot.nodes, probeState);
  const protocols = getProtocolCounts(nodes);
  const statuses = getStatusCounts(nodes);
  const countries = getCountryCounts(nodes);
  const metadata = {
    sources: snapshot.sources,
    fetchedAt: snapshot.fetchedAt,
    upstreamGeneratedAt: snapshot.upstreamGeneratedAt,
    checkedAt: snapshot.checkedAt || null,
    verification: snapshot.verification || null,
    // A verified snapshot that has not been refreshed for hours is stale even if it loaded fine.
    stale: Boolean(snapshot.stale) || Boolean(snapshot.verification
      && Date.now() - Date.parse(snapshot.verification.generatedAt) > VERIFIED_STALE_AFTER_MS),
    refreshError: snapshot.refreshError || null,
    count: nodes.length,
    protocols,
    statuses,
    countries,
    identifiedCount: nodes.filter((node) => node.countryCode).length,
    probeCheckedCount: nodes.filter((node) => node.probeStatus && node.probeStatus !== "unsupported").length,
    probeUpdatedAt: probeState.updatedAt || null,
  };

  if (route === "nodes") {
    return json({
      ...metadata,
      nodes: nodes.map(({ identity, raw, exitIp, clash, ...node }, index) => ({ ...node, id: nodeId({ ...node, raw }), index })),
    });
  }
  if (route === "stats") return json(metadata);
  if (route === "subscription") {
    const selected = filterSubscription(nodes, url);
    if (!selected) return json({ error: "订阅筛选无效；可用 all、best100、verified、apac、west 或 ISO 国家码，并可组合 protocol、region、country。" }, 400);
    const requested = url.searchParams.get("format");
    const format = requested === "plain" || requested === "clash" ? requested : "base64";
    let body;
    let count = selected.length;
    if (format === "clash") {
      // `clash` object = proven in Clash; `null` = failed the Clash re-test; absent = never
      // tested in Clash form (older/fallback snapshots), so convert on the fly.
      const clashNodes = selected.map((node) => ({ ...node, clash: node.clash !== undefined ? node.clash : uriToClash(node.raw) }))
        .filter((node) => node.clash);
      body = buildClashConfig(clashNodes);
      count = clashNodes.length;
    } else {
      const lines = selected.map((node) => node.raw).join("\n") + (selected.length ? "\n" : "");
      body = format === "plain" ? lines : encodeBase64(lines);
    }
    const profile = [
      url.searchParams.get("profile") || "all",
      url.searchParams.get("region"),
      ...url.searchParams.getAll("protocol"),
      ...url.searchParams.getAll("protocols"),
      ...url.searchParams.getAll("country"),
    ].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9,-]/g, "").slice(0, 80);
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": format === "clash" ? "text/yaml; charset=utf-8" : "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="nodescope-${profile}.${format === "plain" ? "txt" : format === "clash" ? "yaml" : "b64"}"`,
        // Lets Clash / v2rayN-style clients show the profile name and auto-update interval.
        "Profile-Update-Interval": "2",
        "Subscription-Userinfo": "upload=0; download=0; total=0; expire=0",
        "X-NodeScope-Profile": profile,
        "X-NodeScope-Count": String(count),
      },
    });
  }

  return json({ error: "API 路径不存在" }, 404);
}
