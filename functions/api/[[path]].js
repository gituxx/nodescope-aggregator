import {
  getCountryCounts,
  getProtocolCounts,
  getStatusCounts,
  getFeedSnapshot,
} from "../../lib/feed.js";
import { mergeProbes, readProbes } from "../../lib/probe.js";

const headers = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  "X-Content-Type-Options": "nosniff",
};

const ASIA_PACIFIC = new Set(["AU", "BD", "BN", "CN", "FJ", "HK", "ID", "IN", "JP", "KH", "KR", "LA", "LK", "MM", "MN", "MO", "MY", "NP", "NZ", "PH", "PK", "SG", "TH", "TW", "VN"]);
const EUROPE = new Set(["AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GE", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SK", "SM", "UA", "VA"]);
const AMERICAS = new Set(["AR", "BO", "BR", "CA", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "JM", "MX", "PA", "PE", "PR", "PY", "SV", "TT", "US", "UY", "VE"]);

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
  const knownProtocols = new Map(nodes.map((node) => [node.protocol.toLowerCase(), node.protocol]));
  const selectedProtocols = protocols.map((value) => knownProtocols.get(value.toLowerCase()));
  const profileCountry = /^[a-z]{2}$/.test(profile) ? profile.toUpperCase() : "";
  const validProfiles = new Set(["all", "best100", "apac", "west"]);

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

  if (profile === "best100") {
    const order = { available: 0, reachable: 1, upstream: 2 };
    const rank = (node) => node.benchmarkStatus === "available" ? 0 : order[node.status] ?? 3;
    selected = [...selected]
      .filter((node) => node.status !== "failed" && (node.benchmarkStatus === "available" || node.status in order))
      .sort((a, b) => rank(a) - rank(b)
        || ((a.benchmarkLatencyMs ?? a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.benchmarkLatencyMs ?? b.latencyMs ?? Number.MAX_SAFE_INTEGER))
        || a.name.localeCompare(b.name, "zh-CN"))
      .slice(0, 100);
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
    const value = url.searchParams.get("index");
    const index = value && /^\d+$/.test(value) ? Number(value) : -1;
    if (!Number.isInteger(index) || index < 0 || index >= snapshot.nodes.length || url.searchParams.get("version") !== snapshot.fetchedAt) {
      return json({ error: "节点已更新，请刷新列表后重试" }, 409);
    }
    return new Response(snapshot.nodes[index].raw, {
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
    stale: Boolean(snapshot.stale),
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
      nodes: nodes.map(({ identity, raw, ...node }, index) => ({ ...node, index })),
    });
  }
  if (route === "stats") return json(metadata);
  if (route === "subscription") {
    const selected = filterSubscription(nodes, url);
    if (!selected) return json({ error: "订阅筛选无效；可用 all、best100、apac、west 或 ISO 国家码，并可组合 protocol、region、country。" }, 400);
    const lines = selected.map((node) => node.raw).join("\n") + (selected.length ? "\n" : "");
    const format = url.searchParams.get("format") === "plain" ? "plain" : "base64";
    const body = format === "plain" ? lines : encodeBase64(lines);
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
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="nodescope-${profile}.${format === "plain" ? "txt" : "b64"}"`,
        "X-NodeScope-Profile": profile,
        "X-NodeScope-Count": String(selected.length),
      },
    });
  }

  return json({ error: "API 路径不存在" }, 404);
}
