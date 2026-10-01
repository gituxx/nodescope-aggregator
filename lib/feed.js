export const FEED_SOURCES = [
  {
    name: "morpheusadam/v2ray-config · best",
    url: "https://raw.githubusercontent.com/morpheusadam/v2ray-config/main/subs/bundles/best.txt",
  },
  {
    name: "yuesuizhengrong/proxy-node-collector",
    url: "https://raw.githubusercontent.com/yuesuizhengrong/proxy-node-collector/main/data/subscription.txt",
  },
];

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_NODES = 2500;
const FRESH_FOR_MS = 4 * 60 * 60 * 1000;
const KEEP_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const protocolNames = {
  ss: "Shadowsocks",
  ssr: "ShadowsocksR",
  vmess: "VMess",
  vless: "VLESS",
  trojan: "Trojan",
  hysteria: "Hysteria",
  hysteria2: "Hysteria2",
  hy2: "Hysteria2",
  tuic: "TUIC",
  wireguard: "WireGuard",
};

function decodeBase64(value) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return "";
  }
}

function parseHostPort(value) {
  const match = value.match(/^\[([\da-f:]+)\]:(\d+)$/i) || value.match(/^([^:]+):(\d+)$/);
  if (!match) return null;
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { server: match[1], port };
}

function parseShadowsocks(uri) {
  const body = uri.slice(uri.indexOf("://") + 3).split("#", 1)[0];
  const at = body.lastIndexOf("@");
  if (at < 0) {
    const decoded = decodeBase64(body.split("/", 1)[0]);
    return parseHostPort(decoded.slice(decoded.lastIndexOf("@") + 1));
  }
  const endpoint = body.slice(at + 1).split("/", 1)[0];
  return parseHostPort(endpoint);
}

function parseShadowsocksR(uri) {
  const decoded = decodeBase64(uri.slice(uri.indexOf("://") + 3).split("#", 1)[0]);
  const endpoint = decoded.split("/", 1)[0];
  const fields = endpoint.split(":");
  if (fields.length < 6) return null;
  return parseHostPort(`${fields[0]}:${fields[1]}`);
}

function parseVmess(uri) {
  const json = decodeBase64(uri.slice(uri.indexOf("://") + 3).split("#", 1)[0]);
  try {
    const config = JSON.parse(json);
    return parseHostPort(`${config.add}:${config.port}`);
  } catch {
    return null;
  }
}

function parseUrl(uri) {
  try {
    const parsed = new URL(uri);
    if (!parsed.hostname || !parsed.port) return null;
    const port = Number(parsed.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { server: parsed.hostname.replace(/^\[|\]$/g, ""), port };
  } catch {
    return null;
  }
}

export function parseNodeUri(uri) {
  const value = uri.trim();
  const scheme = value.match(/^([a-z0-9+.-]+):\/\//i)?.[1]?.toLowerCase();
  const protocol = scheme && protocolNames[scheme];
  if (!protocol) return null;

  let endpoint;
  if (scheme === "ss") endpoint = parseShadowsocks(value);
  else if (scheme === "ssr") endpoint = parseShadowsocksR(value);
  else if (scheme === "vmess") endpoint = parseVmess(value);
  else endpoint = parseUrl(value);
  if (!endpoint) return null;

  let name = "";
  const hashIndex = value.indexOf("#");
  if (hashIndex >= 0) {
    try {
      name = decodeURIComponent(value.slice(hashIndex + 1)).trim();
    } catch {
      name = value.slice(hashIndex + 1).trim();
    }
  }

  const withoutLabel = value.split("#", 1)[0];
  return {
    name: name || `${protocol} ${endpoint.server}`,
    protocol,
    server: endpoint.server,
    port: endpoint.port,
    identity: withoutLabel,
    raw: value,
  };
}

export function parseFeed(text, fetchedAt = new Date().toISOString()) {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > MAX_FEED_BYTES) throw new Error("上游节点清单超过大小限制");

  const generatedMatch = text.match(/^#.*?generated\s+(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/mi);
  const hasUris = /(?:^|\s)(?:ss|ssr|vmess|vless|trojan|hysteria2?|hy2|tuic|wireguard):\/\//im.test(text);
  const content = hasUris ? text : decodeBase64(text.trim());
  if (!content) throw new Error("上游清单不是可识别的节点 URI 或 Base64 订阅");

  const nodes = [];
  const seen = new Set();
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const node = parseNodeUri(line);
    if (!node || seen.has(node.identity)) continue;
    seen.add(node.identity);
    nodes.push(node);
    if (nodes.length >= MAX_NODES) break;
  }

  if (!nodes.length) throw new Error("上游清单中没有可识别的节点链接");
  return { fetchedAt, upstreamGeneratedAt: generatedMatch?.[1] || null, nodes };
}

function cacheKey(request) {
  return new Request(new URL("/__nodescope_cache/feed-v1", request.url), { method: "GET" });
}

export async function getFeedSnapshot(request) {
  const cache = globalThis.caches?.default;
  const key = cache ? cacheKey(request) : null;
  const cachedResponse = key ? await cache.match(key) : null;
  const cached = cachedResponse ? await cachedResponse.json().catch(() => null) : null;
  const now = Date.now();

  if (cached?.fetchedAt && now - Date.parse(cached.fetchedAt) < FRESH_FOR_MS) {
    return { ...cached, stale: false };
  }

  try {
    const sourceResults = await Promise.all(FEED_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          headers: { Accept: "text/plain", "User-Agent": "NodeScope/0.2" },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = parseFeed(await response.text());
        return {
          source: { ...source, fetchedAt: parsed.fetchedAt, upstreamGeneratedAt: parsed.upstreamGeneratedAt, count: parsed.nodes.length },
          nodes: parsed.nodes,
          error: null,
        };
      } catch (error) {
        return { source: { ...source, fetchedAt: null, upstreamGeneratedAt: null, count: 0 }, nodes: [], error: error.message };
      }
    }));

    const seen = new Set();
    const nodes = [];
    for (const result of sourceResults) {
      for (const node of result.nodes) {
        if (seen.has(node.identity)) continue;
        seen.add(node.identity);
        nodes.push({ ...node, source: result.source.name });
        if (nodes.length >= MAX_NODES) break;
      }
      if (nodes.length >= MAX_NODES) break;
    }
    if (!nodes.length) {
      const errors = sourceResults.map(({ source, error }) => `${source.name}: ${error || "没有节点"}`).join("; ");
      throw new Error(errors || "没有可用上游数据源");
    }
    const snapshot = {
      fetchedAt: new Date().toISOString(),
      upstreamGeneratedAt: sourceResults.find((result) => result.source.upstreamGeneratedAt)?.source.upstreamGeneratedAt || null,
      sources: sourceResults.map(({ source, error }) => ({ ...source, error })),
      nodes,
    };

    if (key) {
      await cache.put(key, new Response(JSON.stringify(snapshot), {
        headers: { "Cache-Control": `public, max-age=${Math.floor(KEEP_FOR_MS / 1000)}` },
      }));
    }
    return { ...snapshot, stale: false };
  } catch (error) {
    if (cached?.fetchedAt && now - Date.parse(cached.fetchedAt) < KEEP_FOR_MS) {
      return { ...cached, stale: true, refreshError: error.message };
    }
    throw error;
  }
}

export function getProtocolCounts(nodes) {
  const counts = new Map();
  for (const node of nodes) counts.set(node.protocol, (counts.get(node.protocol) || 0) + 1);
  return [...counts.entries()]
    .map(([protocol, count]) => ({ protocol, count }))
    .sort((a, b) => b.count - a.count || a.protocol.localeCompare(b.protocol));
}
