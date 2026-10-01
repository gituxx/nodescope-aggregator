import { parse as parseYaml } from "yaml";

const countrySources = [
  ["JP", "日本"], ["KR", "韩国"], ["US", "美国"], ["HK", "中国香港"],
  ["SG", "新加坡"], ["TW", "中国台湾"], ["AU", "澳大利亚"], ["IN", "印度"],
  ["CA", "加拿大"], ["GB", "英国"], ["DE", "德国"], ["FR", "法国"], ["NL", "荷兰"],
];

const countryFeeds = countrySources.map(([countryCode, label]) => ({
  name: `Au1rxx 国家分片 · ${label}`,
  url: `https://raw.githubusercontent.com/Au1rxx/free-vpn-subscriptions/main/output/by-country/v2ray-base64-${countryCode}.txt`,
  method: "国家订阅分片",
  countryCode,
  verification: "upstream",
}));

export const FEED_SOURCES = [
  {
    name: "MatinGhanbari/v2ray-configs · all",
    url: "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt",
    method: "GitHub 多源聚合",
  },
  {
    name: "0xRadikal/Free-v2ray-Configs · verified",
    url: "https://raw.githubusercontent.com/0xRadikal/Free-v2ray-Configs/main/verified/configs_base64.txt",
    method: "GitHub 实测订阅",
    verification: "upstream",
  },
  {
    name: "Alirewa/V2ray-Configs · channels",
    url: "https://raw.githubusercontent.com/Alirewa/V2ray-Configs/main/config.txt",
    method: "GitHub 多频道聚合",
  },
  {
    name: "freenodess/freenodess · daily",
    url: "https://raw.githubusercontent.com/freenodess/freenodess/main/nodes/v2ray-base64.txt",
    method: "GitHub 每日聚合",
  },
  {
    name: "OpenProxyList · V2Ray raw list",
    url: "https://openproxylist.com/v2ray/rawlist/text",
    method: "公开订阅目录",
  },
  {
    name: "morpheusadam/v2ray-config · best",
    url: "https://raw.githubusercontent.com/morpheusadam/v2ray-config/main/subs/bundles/best.txt",
    method: "GitHub 仓库",
  },
  {
    name: "yuesuizhengrong/proxy-node-collector",
    url: "https://raw.githubusercontent.com/yuesuizhengrong/proxy-node-collector/main/data/subscription.txt",
    method: "GitHub 多源聚合",
  },
  {
    name: "Au1rxx/free-vpn-subscriptions · verified",
    url: "https://raw.githubusercontent.com/Au1rxx/free-vpn-subscriptions/main/output/v2ray-base64.txt",
    method: "GitHub 多源聚合",
    verification: "upstream",
  },
  {
    name: "735754647/Free-Nodes · tested URI list",
    url: "https://735754647.github.io/Free-Nodes/v2ray-raw.txt",
    method: "GitHub 测速项目",
  },
  {
    name: "Nexus-nodes · all",
    url: "https://raw.githubusercontent.com/ninjastrikers/Nexus-nodes/main/configs/all.txt",
    method: "GitHub 仓库",
  },
  {
    name: "Nexus-nodes · top 50",
    url: "https://raw.githubusercontent.com/ninjastrikers/Nexus-nodes/main/configs/light.txt",
    method: "GitHub 测速项目",
    verification: "upstream",
  },
  {
    name: "mfbpn Telegram channel · Clash mirror",
    url: "https://raw.githubusercontent.com/mfbpn/tg_mfbpn_sub/main/trial.yaml",
    method: "Telegram 公开频道",
    format: "clash",
  },
  {
    name: "FreeNodeBiz · featured public subscription",
    url: "https://freenode.biz/api/featured?format=nsubscribe",
    method: "网页订阅",
  },
  {
    name: "free18/v2ray · v.txt",
    url: "https://raw.githubusercontent.com/free18/v2ray/refs/heads/main/v.txt",
    method: "GitHub 仓库",
  },
  {
    name: "Pawdroid/Free-servers · sub",
    url: "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub",
    method: "GitHub 仓库",
  },
  {
    name: "zhuhaiuk/free-nodes · nodes.txt",
    url: "https://raw.githubusercontent.com/zhuhaiuk/free-nodes/main/nodes.txt",
    method: "GitHub 多源聚合",
  },
  ...countryFeeds,
];

export const BENCHMARK_SOURCE = {
  name: "735754647/Free-Nodes · benchmark report",
  url: "https://735754647.github.io/Free-Nodes/report.json",
  method: "逐节点测试报告",
};

export const COUNTRY_NAMES = {
  AE: "阿联酋", AR: "阿根廷", AT: "奥地利", AU: "澳大利亚", BE: "比利时", BG: "保加利亚",
  BR: "巴西", CA: "加拿大", CH: "瑞士", CL: "智利", CN: "中国", CZ: "捷克", DE: "德国",
  DK: "丹麦", EE: "爱沙尼亚", ES: "西班牙", FI: "芬兰", FR: "法国", GB: "英国", GE: "格鲁吉亚",
  GR: "希腊", HK: "中国香港", HR: "克罗地亚", HU: "匈牙利", ID: "印度尼西亚", IE: "爱尔兰",
  IL: "以色列", IN: "印度", IS: "冰岛", IT: "意大利", JP: "日本", KR: "韩国", LT: "立陶宛",
  LU: "卢森堡", LV: "拉脱维亚", MX: "墨西哥", MY: "马来西亚", NL: "荷兰", NO: "挪威",
  NZ: "新西兰", PL: "波兰", PT: "葡萄牙", RO: "罗马尼亚", RS: "塞尔维亚", RU: "俄罗斯",
  SE: "瑞典", SG: "新加坡", SI: "斯洛文尼亚", SK: "斯洛伐克", TH: "泰国", TR: "土耳其",
  TW: "中国台湾", UA: "乌克兰", US: "美国", ZA: "南非",
};

export function getCountryName(countryCode) {
  return COUNTRY_NAMES[countryCode]
    || new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(countryCode)
    || countryCode;
}

const ASIA_PACIFIC = new Set(["AU", "BD", "BN", "CN", "FJ", "HK", "ID", "IN", "JP", "KH", "KR", "LA", "LK", "MM", "MN", "MO", "MY", "NP", "NZ", "PH", "PK", "SG", "TH", "TW", "VN"]);
const EUROPE = new Set(["AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SK", "SM", "UA", "VA"]);
const AMERICAS = new Set(["AR", "BO", "BR", "CA", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "JM", "MX", "PA", "PE", "PR", "PY", "SV", "TT", "US", "UY", "VE"]);

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

const MAX_FEED_BYTES = 4 * 1024 * 1024;
const MAX_NODES = 5000;
const FRESH_FOR_MS = 4 * 60 * 60 * 1000;
const KEEP_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 30 * 60 * 1000;
const MIN_REFRESH_RATIO = 0.35;
const MIN_REFRESH_NODES = 150;
const SNAPSHOT_KEY = "snapshot:v3";

function decodeBase64(value) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return "";
  }
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
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
    return parseHostPort(`${config.add || config.address}:${config.port}`);
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

function clashToUri(proxy) {
  if (!proxy || typeof proxy !== "object" || typeof proxy.server !== "string") return "";
  const port = Number(proxy.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return "";
  const type = String(proxy.type || "").toLowerCase();
  const name = String(proxy.name || `${type} ${proxy.server}`);
  const label = `#${encodeURIComponent(name)}`;
  const options = new URLSearchParams();
  const network = String(proxy.network || (proxy["ws-opts"] ? "ws" : "tcp"));
  const wsOptions = proxy["ws-opts"] || {};
  const headers = wsOptions.headers || {};
  const serverName = proxy.servername || proxy.sni || headers.Host || "";

  if (type === "vmess") {
    const config = {
      v: "2", ps: name, add: proxy.server, port: String(port), id: proxy.uuid || proxy.id || "",
      aid: String(proxy.alterId ?? 0), scy: proxy.cipher || "auto", net: network,
      type: proxy["network"] === "tcp" ? (proxy["tcp-opts"]?.header?.type || "none") : "none",
      host: headers.Host || "", path: wsOptions.path || proxy["grpc-opts"]?.["grpc-service-name"] || "/",
      tls: proxy.tls ? "tls" : "", sni: serverName,
      fp: proxy["client-fingerprint"] || "",
    };
    return `vmess://${encodeBase64(JSON.stringify(config))}${label}`;
  }

  if (network !== "tcp") options.set("type", network);
  if (serverName) options.set("sni", serverName);
  if (proxy["client-fingerprint"]) options.set("fp", proxy["client-fingerprint"]);
  if (network === "ws") {
    if (wsOptions.path) options.set("path", wsOptions.path);
    if (headers.Host) options.set("host", headers.Host);
  }
  if (proxy.tls) options.set("security", "tls");
  if (proxy["reality-opts"]) {
    options.set("security", "reality");
    if (proxy["reality-opts"]["public-key"]) options.set("pbk", proxy["reality-opts"]["public-key"]);
    if (proxy["reality-opts"]["short-id"]) options.set("sid", proxy["reality-opts"]["short-id"]);
  }
  if (type === "ss") {
    const auth = encodeBase64(`${proxy.cipher || "aes-128-gcm"}:${proxy.password || ""}`);
    const plugin = proxy.plugin ? `?plugin=${encodeURIComponent(proxy.plugin)}` : "";
    return `ss://${auth}@${proxy.server}:${port}${plugin}${label}`;
  }
  if (type === "trojan") return `trojan://${encodeURIComponent(proxy.password || "")}@${proxy.server}:${port}?${options}${label}`;
  if (type === "vless") return `vless://${encodeURIComponent(proxy.uuid || proxy.id || "")}@${proxy.server}:${port}?${options}${label}`;
  if (type === "hysteria2" || type === "hy2") {
    if (proxy.obfs) options.set("obfs", proxy.obfs);
    if (proxy["obfs-password"]) options.set("obfs-password", proxy["obfs-password"]);
    return `hysteria2://${encodeURIComponent(proxy.password || "")}@${proxy.server}:${port}?${options}${label}`;
  }
  if (type === "hysteria") return `hysteria://${encodeURIComponent(proxy.auth || proxy.auth_str || "")}@${proxy.server}:${port}?${options}${label}`;
  if (type === "tuic") return `tuic://${encodeURIComponent(proxy.uuid || "")}:${encodeURIComponent(proxy.password || "")}@${proxy.server}:${port}?${options}${label}`;
  return "";
}

function parseClashFeed(text) {
  let document;
  try {
    document = parseYaml(text, { maxAliasCount: 50, uniqueKeys: true });
  } catch {
    throw new Error("Telegram YAML 清单无法解析");
  }
  if (!Array.isArray(document?.proxies)) throw new Error("Clash YAML 中没有代理列表");
  return document.proxies.map(clashToUri).filter(Boolean).map(parseNodeUri).filter(Boolean);
}

function inferCountryCode(nodeName) {
  const chars = Array.from(nodeName);
  const flagCodes = chars
    .filter((char) => {
      const point = char.codePointAt(0);
      return point >= 0x1f1e6 && point <= 0x1f1ff;
    })
    .map((char) => String.fromCharCode(char.codePointAt(0) - 0x1f1e6 + 65));
  if (flagCodes.length >= 2) {
    const candidate = flagCodes.slice(0, 2).join("");
    if (COUNTRY_NAMES[candidate]) return candidate;
  }

  const tokens = nodeName.toUpperCase().match(/\b[A-Z]{2}\b/g) || [];
  const code = tokens.find((candidate) => COUNTRY_NAMES[candidate]);
  if (code) return code;

  const labels = [
    ["HK", /香港|hong\s*kong/i], ["TW", /台湾|台灣|taiwan/i], ["JP", /日本|japan/i],
    ["KR", /韩国|韓國|korea/i], ["SG", /新加坡|singapore/i], ["US", /美国|美國|united states|\busa\b/i],
    ["CA", /加拿大|canada/i], ["GB", /英国|英國|united kingdom|\buk\b/i], ["DE", /德国|德國|germany/i],
    ["FR", /法国|法國|france/i], ["NL", /荷兰|荷蘭|netherlands|holland/i], ["AU", /澳大利亚|澳洲|australia/i],
    ["IN", /印度|india/i], ["RU", /俄罗斯|俄羅斯|russia/i], ["TR", /土耳其|turkey/i],
    ["CH", /瑞士|switzerland/i], ["FI", /芬兰|芬蘭|finland/i], ["SE", /瑞典|sweden/i],
    ["IT", /意大利|italy/i], ["ES", /西班牙|spain/i], ["PL", /波兰|波蘭|poland/i],
  ];
  return labels.find(([, pattern]) => pattern.test(nodeName))?.[0] || null;
}

export function getRegion(countryCode) {
  if (ASIA_PACIFIC.has(countryCode)) return "asia-pacific";
  if (EUROPE.has(countryCode)) return "europe";
  if (AMERICAS.has(countryCode)) return "americas";
  return countryCode ? "other" : null;
}

export function parseFeed(text, fetchedAt = new Date().toISOString(), format = "auto") {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > MAX_FEED_BYTES) throw new Error("上游节点清单超过大小限制");
  if (format === "clash") {
    const nodes = parseClashFeed(text);
    if (!nodes.length) throw new Error("Clash YAML 中没有可识别的节点链接");
    return { fetchedAt, upstreamGeneratedAt: null, nodes };
  }

  const generatedMatch = text.match(/^#.*?generated\s+(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/mi);
  let content = text;
  const isXmlFeed = /<\s*(?:rss|feed|item|entry)\b/i.test(text);
  if (isXmlFeed) {
    const xml = decodeXml(text);
    const linkedUris = [...xml.matchAll(/\b(?:href|url)\s*=\s*["']((?:ss|ssr|vmess|vless|trojan|hysteria2?|hy2|tuic|wireguard):\/\/[^"']+)["']/gi)]
      .map((match) => match[1]);
    content = `${xml.replace(/<[^>]*>/g, " ")}\n${linkedUris.join("\n")}`;
  }
  if (!/(?:^|\s)(?:ss|ssr|vmess|vless|trojan|hysteria2?|hy2|tuic|wireguard):\/\//im.test(content)) {
    content = decodeBase64(text.trim());
  }
  if (!content) throw new Error("上游清单不是可识别的节点 URI、RSS 或 Base64 订阅");

  const nodes = [];
  const seen = new Set();
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const node = parseNodeUri(line.trim());
    if (!node || seen.has(node.identity)) continue;
    seen.add(node.identity);
    nodes.push(node);
    if (nodes.length >= MAX_NODES) break;
  }

  if (!nodes.length) throw new Error("上游清单中没有可识别的节点链接");
  return { fetchedAt, upstreamGeneratedAt: generatedMatch?.[1] || null, nodes };
}

function endpointKey(node) {
  return `${node.protocol}\u0000${String(node.server).toLowerCase()}\u0000${node.port}`;
}

function applyLocation(node, countryCode, locationSource) {
  if (!/^[A-Z]{2}$/.test(countryCode || "")) return node;
  node.countryCode = countryCode;
  node.country = getCountryName(countryCode);
  node.region = getRegion(countryCode);
  node.locationSource = locationSource;
  return node;
}

function getGithubCdnMirror(url) {
  const match = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/(.+)$/i);
  if (!match) return null;
  const path = match[2].replace(/^refs\/heads\//, "");
  const separator = path.indexOf("/");
  if (separator < 1) return null;
  const ref = path.slice(0, separator);
  const file = path.slice(separator + 1);
  return `https://cdn.jsdelivr.net/gh/${match[1]}@${ref}/${file}`;
}

function getSourceUrls(source) {
  return [...new Set([source.url, ...(source.mirrors || []), getGithubCdnMirror(source.url)].filter(Boolean))];
}

async function readFeedText(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
    throw new Error("上游节点清单超过大小限制");
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_FEED_BYTES) throw new Error("上游节点清单超过大小限制");
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_FEED_BYTES) {
      await reader.cancel();
      throw new Error("上游节点清单超过大小限制");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchSource(source) {
  const failures = [];
  const urls = getSourceUrls(source);
  for (const [index, url] of urls.entries()) {
    try {
      const fetchedAt = new Date().toISOString();
      const response = await fetch(url, {
        headers: { Accept: source.format === "clash" ? "text/yaml,text/plain" : "text/plain,*/*", "User-Agent": "NodeScope/0.3" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseFeed(await readFeedText(response), fetchedAt, source.format || "auto");
      return {
        source: {
          ...source,
          fetchedAt: parsed.fetchedAt,
          upstreamGeneratedAt: parsed.upstreamGeneratedAt,
          count: parsed.nodes.length,
          mirrorUsed: index > 0,
          error: null,
        },
        nodes: parsed.nodes,
      };
    } catch (error) {
      failures.push(`${new URL(url).hostname}: ${error.message}`);
    }
  }
  throw new Error(failures.join("; "));
}

async function fetchInBatches(sources, batchSize = 5) {
  const results = [];
  for (let index = 0; index < sources.length; index += batchSize) {
    const batch = sources.slice(index, index + batchSize);
    results.push(...await Promise.all(batch.map(async (source) => {
      try {
        return await fetchSource(source);
      } catch (error) {
        return {
          source: { ...source, fetchedAt: null, upstreamGeneratedAt: null, count: 0, error: error.message },
          nodes: [],
        };
      }
    })));
  }
  return results;
}

async function fetchBenchmarkReport() {
  try {
    const response = await fetch(BENCHMARK_SOURCE.url, {
      headers: { Accept: "application/json", "User-Agent": "NodeScope/0.3" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const report = await response.json();
    const source = { ...BENCHMARK_SOURCE, fetchedAt: report.generated_at || new Date().toISOString(), count: Array.isArray(report.nodes) ? report.nodes.length : 0, error: null };
    const checks = new Map();
    for (const entry of report.nodes || []) {
      const protocol = protocolNames[String(entry.type || "").toLowerCase()];
      const port = Number(entry.port);
      if (!protocol || typeof entry.server !== "string" || !Number.isInteger(port)) continue;
      const latencyMs = Number(entry.latency_ms);
      const status = entry.error ? "failed" : Number.isFinite(latencyMs) && latencyMs > 0 ? "available" : "unknown";
      checks.set(endpointKey({ protocol, server: entry.server, port }), {
        status,
        latencyMs: Number.isFinite(latencyMs) && latencyMs > 0 ? latencyMs : null,
        error: entry.error ? String(entry.error).slice(0, 120) : null,
        countryCode: typeof entry.country_code === "string" ? entry.country_code.toUpperCase() : null,
      });
    }
    return { source, checks, checkedAt: report.generated_at || source.fetchedAt };
  } catch (error) {
    return {
      source: { ...BENCHMARK_SOURCE, fetchedAt: null, count: 0, error: error.message },
      checks: new Map(),
      checkedAt: null,
    };
  }
}

export async function collectFeedSnapshot() {
  const [sourceResults, benchmark] = await Promise.all([
    fetchInBatches(FEED_SOURCES),
    fetchBenchmarkReport(),
  ]);

  const groupedSources = new Map();
  for (const result of sourceResults) {
    const group = result.source.name.match(/^[^/.\s·]+/)?.[0] || result.source.name;
    const items = groupedSources.get(group) || [];
    items.push(result);
    groupedSources.set(group, items);
  }
  const sourceQueues = [...groupedSources.values()].map((results) => ({
    results,
    indexes: new Array(results.length).fill(0),
    cursor: 0,
    take() {
      for (let attempts = 0; attempts < this.results.length; attempts += 1) {
        const index = this.cursor;
        this.cursor = (this.cursor + 1) % this.results.length;
        const result = this.results[index];
        const nodeIndex = this.indexes[index];
        if (nodeIndex >= result.nodes.length) continue;
        this.indexes[index] += 1;
        return { result, parsedNode: result.nodes[nodeIndex] };
      }
      return null;
    },
  }));

  const nodesByIdentity = new Map();
  while (nodesByIdentity.size < MAX_NODES) {
    let advanced = false;
    for (const queue of sourceQueues) {
      const candidate = queue.take();
      if (!candidate) continue;
      advanced = true;
      const { result, parsedNode } = candidate;
      if (!nodesByIdentity.has(parsedNode.identity)) {
        const node = {
          ...parsedNode,
          source: result.source.name,
          method: result.source.method,
          status: result.source.verification === "upstream" ? "upstream" : "unknown",
          statusLabel: result.source.verification === "upstream" ? "上游筛选" : "未验证",
          latencyMs: null,
          checkedAt: result.source.verification === "upstream" ? result.source.fetchedAt : null,
          countryCode: null,
          country: "待识别",
          region: null,
          locationSource: null,
          sourcesCount: 1,
        };
        nodesByIdentity.set(parsedNode.identity, node);
      } else {
        const node = nodesByIdentity.get(parsedNode.identity);
        node.sourcesCount += 1;
        if (node.status === "unknown" && result.source.verification === "upstream") {
          node.status = "upstream";
          node.statusLabel = "上游筛选";
          node.checkedAt = result.source.fetchedAt;
        }
      }

      if (result.source.countryCode) {
        applyLocation(nodesByIdentity.get(parsedNode.identity), result.source.countryCode, "国家订阅分片");
      } else if (!nodesByIdentity.get(parsedNode.identity).countryCode) {
        const inferred = inferCountryCode(parsedNode.name);
        if (inferred) applyLocation(nodesByIdentity.get(parsedNode.identity), inferred, "节点名称标识");
      }
      if (nodesByIdentity.size >= MAX_NODES) break;
    }
    if (!advanced) break;
  }

  for (const node of nodesByIdentity.values()) {
    const check = benchmark.checks.get(endpointKey(node));
    if (check) {
      node.status = check.status;
      node.statusLabel = check.status === "available" ? "近期可用" : check.status === "failed" ? "测试失败" : "状态未知";
      node.latencyMs = check.latencyMs;
      node.checkedAt = benchmark.checkedAt;
      if (check.countryCode) applyLocation(node, check.countryCode, "出口 IP 测试报告");
      if (check.error) node.statusDetail = check.error;
    }
  }

  const nodes = [...nodesByIdentity.values()].slice(0, MAX_NODES);
  if (!nodes.length) {
    const errors = sourceResults.map(({ source }) => `${source.name}: ${source.error || "没有节点"}`).join("; ");
    const error = new Error(errors || "没有可用上游数据源");
    error.sources = [...sourceResults.map(({ source }) => source), benchmark.source];
    throw error;
  }

  const allSources = [
    ...sourceResults.map(({ source }) => source),
    benchmark.source,
  ];
  return {
    fetchedAt: new Date().toISOString(),
    upstreamGeneratedAt: sourceResults.find((result) => result.source.upstreamGeneratedAt)?.source.upstreamGeneratedAt || null,
    checkedAt: benchmark.checkedAt,
    stale: false,
    sources: allSources,
    nodes,
  };
}

function cacheKey(request) {
  return new Request(new URL("/__nodescope_cache/feed-v3", request.url), { method: "GET" });
}

function isRetained(snapshot, now = Date.now()) {
  const fetchedAt = Date.parse(snapshot?.fetchedAt || "");
  return Number.isFinite(fetchedAt) && now - fetchedAt < KEEP_FOR_MS;
}

function retentionSeconds(snapshot, now = Date.now()) {
  const fetchedAt = Date.parse(snapshot?.fetchedAt || "");
  if (!Number.isFinite(fetchedAt)) return Math.floor(KEEP_FOR_MS / 1000);
  return Math.max(60, Math.ceil((KEEP_FOR_MS - (now - fetchedAt)) / 1000));
}

function getSnapshotQualityIssue(previous, next) {
  const previousCount = previous?.nodes?.length || 0;
  const nextCount = next?.nodes?.length || 0;
  if (!previousCount || !nextCount) return null;
  const minimum = Math.min(previousCount, Math.max(MIN_REFRESH_NODES, Math.ceil(previousCount * MIN_REFRESH_RATIO)));
  if (nextCount >= minimum) return null;
  return `本轮仅采集到 ${nextCount} 个节点，低于保留阈值 ${minimum} 个；继续使用上次 ${previousCount} 个节点。`;
}

function retainSnapshot(previous, sources, error, attemptedAt = new Date().toISOString()) {
  return {
    ...previous,
    sources: sources?.length ? sources : previous.sources,
    stale: true,
    lastAttemptAt: attemptedAt,
    refreshError: String(error || "本轮采集未通过数据量检查").slice(0, 600),
  };
}

async function readSnapshot(request, env) {
  if (env?.NODESCOPE_DATA) {
    const value = await env.NODESCOPE_DATA.get(SNAPSHOT_KEY);
    if (value) {
      try { return JSON.parse(value); } catch { return null; }
    }
  }
  const cache = globalThis.caches?.default;
  if (!cache) return null;
  const cachedResponse = await cache.match(cacheKey(request));
  return cachedResponse ? cachedResponse.json().catch(() => null) : null;
}

async function writeSnapshot(request, env, snapshot, ttlSeconds = Math.floor(KEEP_FOR_MS / 1000)) {
  if (env?.NODESCOPE_DATA) {
    await env.NODESCOPE_DATA.put(SNAPSHOT_KEY, JSON.stringify(snapshot), { expirationTtl: ttlSeconds });
  }
  const cache = globalThis.caches?.default;
  if (cache) {
    await cache.put(cacheKey(request), new Response(JSON.stringify(snapshot), {
      headers: { "Cache-Control": `public, max-age=${ttlSeconds}` },
    }));
  }
}

export async function refreshAndStore(env) {
  let previous = null;
  if (env?.NODESCOPE_DATA) {
    try { previous = JSON.parse(await env.NODESCOPE_DATA.get(SNAPSHOT_KEY) || "null"); } catch { previous = null; }
  }
  const now = Date.now();
  if (!isRetained(previous, now)) previous = null;

  let snapshot;
  try {
    snapshot = await collectFeedSnapshot();
  } catch (error) {
    if (!previous) throw error;
    const retained = retainSnapshot(previous, error.sources, error.message);
    await env.NODESCOPE_DATA.put(SNAPSHOT_KEY, JSON.stringify(retained), { expirationTtl: retentionSeconds(previous, now) });
    return retained;
  }

  const qualityIssue = getSnapshotQualityIssue(previous, snapshot);
  if (previous && qualityIssue) {
    const retained = retainSnapshot(previous, snapshot.sources, qualityIssue, snapshot.fetchedAt);
    await env.NODESCOPE_DATA.put(SNAPSHOT_KEY, JSON.stringify(retained), { expirationTtl: retentionSeconds(previous, now) });
    return retained;
  }

  if (env?.NODESCOPE_DATA) {
    await env.NODESCOPE_DATA.put(SNAPSHOT_KEY, JSON.stringify(snapshot), { expirationTtl: Math.floor(KEEP_FOR_MS / 1000) });
  }
  return snapshot;
}

export async function getFeedSnapshot(request, env = {}) {
  const cached = await readSnapshot(request, env);
  const now = Date.now();
  if (cached?.stale && cached.lastAttemptAt && now - Date.parse(cached.lastAttemptAt) < RETRY_AFTER_FAILURE_MS) {
    return { ...cached, stale: true };
  }
  if (cached?.fetchedAt && now - Date.parse(cached.fetchedAt) < FRESH_FOR_MS) return { ...cached, stale: false };

  try {
    const snapshot = await collectFeedSnapshot();
    const qualityIssue = isRetained(cached, now) && getSnapshotQualityIssue(cached, snapshot);
    if (qualityIssue) {
      const retained = retainSnapshot(cached, snapshot.sources, qualityIssue, snapshot.fetchedAt);
      await writeSnapshot(request, env, retained, retentionSeconds(cached, now));
      return retained;
    }
    await writeSnapshot(request, env, snapshot);
    return { ...snapshot, stale: false };
  } catch (error) {
    if (isRetained(cached, now)) {
      const retained = retainSnapshot(cached, error.sources, error.message);
      await writeSnapshot(request, env, retained, retentionSeconds(cached, now));
      return retained;
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

export function getStatusCounts(nodes) {
  const counts = { available: 0, reachable: 0, failed: 0, upstream: 0, unknown: 0 };
  for (const node of nodes) counts[node.status] = (counts[node.status] || 0) + 1;
  return counts;
}

export function getCountryCounts(nodes) {
  const counts = new Map();
  for (const node of nodes) {
    if (!node.countryCode) continue;
    counts.set(node.countryCode, (counts.get(node.countryCode) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([countryCode, count]) => ({ countryCode, country: getCountryName(countryCode), count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country, "zh-CN"));
}
