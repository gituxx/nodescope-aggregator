import { getCountryName, getRegion } from "./feed.js";

const KEY = "probes:v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const BATCH_SIZE = 20;
const GEO_BATCH_SIZE = 60;
const DNS_BATCH_SIZE = 10;
const TCP_PROTOCOLS = new Set(["Shadowsocks", "ShadowsocksR", "VMess", "VLESS", "Trojan"]);

export function probeKey(node) {
  const endpoint = `${String(node.server).toLowerCase()}:${node.port}`;
  return TCP_PROTOCOLS.has(node.protocol) ? endpoint : `udp:${endpoint}`;
}

function safeHost(host) {
  if (!host || host.length > 253 || /[\s/@?#]/.test(host)) return false;
  const value = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (value === "localhost" || /\.(?:localhost|local|internal|test|invalid)$/.test(value)) return false;
  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    return a > 0 && a < 224 && a !== 10 && a !== 127 && !(a === 169 && b === 254)
      && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168)
      && !(a === 100 && b >= 64 && b <= 127) && !(a === 192 && b === 0 && c === 0)
      && !(a === 198 && (b === 18 || b === 19)) && d <= 255 && b <= 255 && c <= 255;
  }
  if (value.includes(":")) return !/^(?:::|::1|fc|fd|fe80)/i.test(value);
  return value.includes(".") && /^[a-z0-9.-]+$/.test(value);
}

function classifyError(error) {
  const detail = String(error?.message || error || "连接失败");
  if (/disallowed|not permitted|not allowed|loop|prohibited|private network|cloudflare ip|cannot connect to the specified address/i.test(detail)) return "unsupported";
  return "failed";
}

function remoteIp(address) {
  if (!address) return null;
  const value = String(address);
  if (value.startsWith("[")) return value.slice(1, value.indexOf("]")) || null;
  if ((value.match(/:/g) || []).length > 1) return value;
  return value.replace(/:\d+$/, "");
}

function isPublicIp(value) {
  return typeof value === "string" && safeHost(value)
    && (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) || /^[\da-f:]+$/i.test(value));
}

export async function testTcp(node, connectSocket) {
  const checkedAt = new Date().toISOString();
  if (!TCP_PROTOCOLS.has(node.protocol) || !safeHost(node.server) || !Number.isInteger(node.port) || node.port < 1 || node.port > 65535) {
    return { status: "unsupported", latencyMs: null, checkedAt, detail: "此协议或地址不支持 TCP 入口测试" };
  }
  let socket;
  const started = Date.now();
  try {
    socket = connectSocket({ hostname: node.server, port: node.port });
    let timeout;
    const opened = await Promise.race([
      socket.opened,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("连接超时")), 3500); }),
    ]).finally(() => clearTimeout(timeout));
    return { status: "reachable", latencyMs: Math.max(1, Date.now() - started), checkedAt, ip: remoteIp(opened?.remoteAddress) || (node.server.match(/^[\d.]+$/) ? node.server : null) };
  } catch (error) {
    return { status: classifyError(error), latencyMs: null, checkedAt, detail: String(error?.message || "连接失败").slice(0, 100) };
  } finally {
    if (socket) await socket.close().catch(() => {});
  }
}

export async function readProbes(env) {
  if (!env?.NODESCOPE_DATA) return { checks: {}, geo: {} };
  try {
    return await env.NODESCOPE_DATA.get(KEY, "json") || { checks: {}, geo: {} };
  } catch {
    return { checks: {}, geo: {} };
  }
}

async function locateIps(ips) {
  if (!ips.length) return [];
  try {
    const response = await fetch("https://api.country.is/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ips),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const results = await response.json();
    return Array.isArray(results)
      ? results.filter((item) => ips.includes(item.ip) && /^[A-Z]{2}$/.test(item.country)).map((item) => [item.ip, item.country])
      : [];
  } catch { return []; }
}

async function resolveHosts(hosts) {
  const results = [];
  for (let i = 0; i < hosts.length; i += 5) {
    const group = hosts.slice(i, i + 5);
    results.push(...await Promise.all(group.map(async (host) => {
      try {
        const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`;
        const response = await fetch(url, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(3000) });
        if (!response.ok) return [host, null];
        const data = await response.json();
        const ip = data.Answer?.find((answer) => answer.type === 1 && isPublicIp(answer.data))?.data || null;
        return [host, ip];
      } catch { return [host, null]; }
    })));
  }
  return results;
}

export async function runProbeBatch(env, tester = testTcp, geolocate = locateIps, resolve = resolveHosts) {
  const snapshot = await env.NODESCOPE_DATA.get("snapshot:v3", "json");
  if (!snapshot?.nodes?.length) return { checked: 0, reason: "no-snapshot" };
  const state = await readProbes(env);
  const checks = state.checks || {};
  const geo = state.geo || {};
  const dns = state.dns || {};
  const geoAttempts = state.geoAttempts || {};
  for (const check of Object.values(checks)) if (check.ip) check.ip = remoteIp(check.ip);
  const unique = new Map();
  for (const node of snapshot.nodes) if (!unique.has(probeKey(node))) unique.set(probeKey(node), node);
  const candidates = [...unique.values()]
    .filter((node) => !checks[probeKey(node)] || Date.now() - Date.parse(checks[probeKey(node)].checkedAt) > MAX_AGE_MS)
    .sort((a, b) => (Date.parse(checks[probeKey(a)]?.checkedAt || 0) || 0) - (Date.parse(checks[probeKey(b)]?.checkedAt || 0) || 0))
    .slice(0, BATCH_SIZE);
  for (let i = 0; i < candidates.length; i += 5) {
    const group = candidates.slice(i, i + 5);
    const results = await Promise.all(group.map((node) => tester(node)));
    group.forEach((node, index) => { checks[probeKey(node)] = results[index]; });
  }
  const hosts = [...new Set(snapshot.nodes.filter((node) => !node.countryCode && safeHost(node.server) && !isPublicIp(node.server))
    .map((node) => node.server.toLowerCase()))]
    .filter((host) => !dns[host] || Date.now() - Date.parse(dns[host].checkedAt) > 24 * 60 * 60 * 1000)
    .slice(0, DNS_BATCH_SIZE);
  for (const [host, ip] of await resolve(hosts)) dns[host] = { ip, checkedAt: new Date().toISOString() };
  const ips = [...new Set([
    ...Object.values(checks).map((check) => check.ip),
    ...Object.values(dns).map((entry) => entry.ip),
    ...snapshot.nodes.map((node) => isPublicIp(node.server) ? node.server : null),
  ].filter((ip) => isPublicIp(ip) && !geo[ip]
    && (!geoAttempts[ip] || Date.now() - Date.parse(geoAttempts[ip]) > 60 * 60 * 1000)))].slice(0, GEO_BATCH_SIZE);
  const geoResults = await geolocate(ips);
  for (const ip of ips) geoAttempts[ip] = new Date().toISOString();
  for (const [ip, countryCode] of geoResults) {
    geo[ip] = countryCode;
    delete geoAttempts[ip];
  }
  const liveKeys = new Set(unique.keys());
  for (const key of Object.keys(checks)) if (!liveKeys.has(key)) delete checks[key];
  const liveHosts = new Set(snapshot.nodes.map((node) => node.server.toLowerCase()));
  for (const host of Object.keys(dns)) if (!liveHosts.has(host)) delete dns[host];
  const liveIps = new Set([
    ...snapshot.nodes.map((node) => node.server),
    ...Object.values(checks).map((check) => check.ip),
    ...Object.values(dns).map((entry) => entry.ip),
  ]);
  for (const ip of Object.keys(geo)) if (!liveIps.has(ip)) delete geo[ip];
  for (const ip of Object.keys(geoAttempts)) if (!liveIps.has(ip)) delete geoAttempts[ip];
  await env.NODESCOPE_DATA.put(KEY, JSON.stringify({ checks, geo, dns, geoAttempts, updatedAt: new Date().toISOString() }));
  return { checked: candidates.length, total: unique.size };
}

export function mergeProbes(nodes, state) {
  const checks = state?.checks || {};
  const geo = state?.geo || {};
  const dns = state?.dns || {};
  return nodes.map((original) => {
    const node = { ...original };
    if (["available", "failed"].includes(original.status)) {
      node.benchmarkStatus = original.status;
      node.benchmarkLatencyMs = original.latencyMs;
      node.benchmarkCheckedAt = original.checkedAt;
    }
    const check = checks[probeKey(node)];
    if (check && Date.now() - Date.parse(check.checkedAt) <= MAX_AGE_MS) {
      node.probeStatus = check.status;
      node.probeLatencyMs = check.latencyMs;
      node.probeCheckedAt = check.checkedAt;
      node.probeDetail = check.detail || null;
      if (check.status === "reachable") {
        node.status = "reachable";
        node.statusLabel = "TCP 可达";
        node.latencyMs = check.latencyMs;
        node.checkedAt = check.checkedAt;
      } else if (check.status === "failed") {
        node.status = "failed";
        node.statusLabel = "TCP 失败";
        node.latencyMs = null;
        node.checkedAt = check.checkedAt;
      } else if (check.status === "unsupported" && node.status === "unknown") {
        node.statusLabel = "暂不支持测试";
      }
    }
    const countryCode = geo[check?.ip] || geo[dns[node.server.toLowerCase()]?.ip] || geo[node.server];
    if (!node.countryCode && countryCode) {
      node.countryCode = countryCode;
      node.country = getCountryName(countryCode);
      node.region = getRegion(countryCode);
      node.locationSource = "入口 IP 地理库";
    }
    return node;
  });
}
