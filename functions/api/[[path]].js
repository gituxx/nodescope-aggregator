import {
  AMERICAS,
  ASIA_PACIFIC,
  EUROPE,
  getCountryCounts,
  getProtocolCounts,
  getStatusCounts,
  getFeedSnapshot,
} from "../../lib/feed.js";
import { mergeProbes, readProbes } from "../../lib/probe.js";
import { buildClashConfig, uriToClash } from "../../lib/clash.js";

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

export function filterSubscription(nodes, url) {
  const params = url.searchParams;
  const profile = (params.get("profile") || "all").toLowerCase();
  const values = (key) => [...new Set(params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];
  const countries = values("country").map((value) => value.toUpperCase());
  const protocols = [...values("protocol"), ...values("protocols")];
  const selectedRegion = (params.get("region") || "all").toLowerCase();
  const countryCodes = new Set(nodes.map((node) => node.countryCode).filter(Boolean));
  const knownProtocols = new Map(nodes.filter((node) => typeof node.protocol === "string" && node.protocol).map((node) => [node.protocol.toLowerCase(), node.protocol]));
  const selectedProtocols = protocols.map((value) => knownProtocols.get(value.toLowerCase()));
  const profileCountry = /^[a-z]{2}$/.test(profile) ? profile.toUpperCase() : "";
  const validProfiles = new Set(["all", "best100", "verified", "apac", "west"]);

  if ((!validProfiles.has(profile) && !countryCodes.has(profileCountry))
    || (countries.some((country) => !countryCodes.has(country)))
    || selectedProtocols.some((protocol) => !protocol)
    || !["all", "apac", "west", "europe", "americas"].includes(selectedRegion)) return null;

  let selected = nodes;
  if (profile === "apac") selected = selected.filter((node) => node.countryCode && ASIA_PACIFIC.has(node.countryCode));
  else if (profile === "west") selected = selected.filter((node) => node.countryCode && (EUROPE.has(node.countryCode) || AMERICAS.has(node.countryCode)));
  else if (profileCountry) selected = selected.filter((node) => node.countryCode === profileCountry);
  if (selectedRegion === "apac") selected = selected.filter((node) => node.countryCode && ASIA_PACIFIC.has(node.countryCode));
  else if (selectedRegion === "west") selected = selected.filter((node) => node.countryCode && (EUROPE.has(node.countryCode) || AMERICAS.has(node.countryCode)));
  else if (selectedRegion === "europe") selected = selected.filter((node) => node.countryCode && EUROPE.has(node.countryCode));
  else if (selectedRegion === "americas") selected = selected.filter((node) => node.countryCode && AMERICAS.has(node.countryCode));
  if (countries.length) selected = selected.filter((node) => countries.includes(node.countryCode));
  if (selectedProtocols.length) selected = selected.filter((node) => selectedProtocols.includes(node.protocol));

  if (profile === "verified") selected = selected.filter((node) => node.verifiedAt && node.status === "available");
  if (profile === "best100" || profile === "verified") {
    const order = { available: 0, reachable: 1, upstream: 2 };
    const rank = (node) => node.benchmarkStatus === "available" ? 0 : order[node.status] ?? 3;
    const latency = (node) => node.benchmarkLatencyMs ?? node.latencyMs ?? Number.MAX_SAFE_INTEGER;
    selected = [...selected]
      .filter((node) => node.status !== "failed" && (node.benchmarkStatus === "available" || node.status in order))
      .sort((a, b) => rank(a) - rank(b)
        || (b.score ?? -1) - (a.score ?? -1)
        || latency(a) - latency(b)
        || String(a.name).localeCompare(String(b.name), "zh-CN"));
    if (profile === "best100") {
      // Spread the top list across countries so one region cannot monopolise it.
      const perCountry = new Map();
      const picked = [];
      const overflow = [];
      for (const node of selected) {
        const key = node.countryCode || "??";
        const count = perCountry.get(key) || 0;
        if (count < 25) { perCountry.set(key, count + 1); picked.push(node); } else overflow.push(node);
        if (picked.length >= 100) break;
      }
      selected = [...picked, ...overflow].slice(0, 100);
    }
  }
  return selected;
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
    if (format === "clash") {
      // Verified nodes carry a Clash object proven in Clash; others are converted on the fly.
      const clashNodes = selected.map((node) => ({ ...node, clash: node.clash || (node.verifiedAt ? null : uriToClash(node.raw)) }))
        .filter((node) => node.clash);
      body = buildClashConfig(clashNodes);
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
        "X-NodeScope-Count": String(selected.length),
      },
    });
  }

  return json({ error: "API 路径不存在" }, 404);
}
