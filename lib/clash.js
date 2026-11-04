// Convert node URIs into mihomo / Clash Meta proxy objects and build ready-to-import configs.
// Runs in Node (verifier) and in Cloudflare Workers (API), so it must stay dependency-free
// apart from the YAML serializer.
import { stringify } from "yaml";

function b64decode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

const truthy = (value) => ["1", "true", "yes"].includes(String(value || "").toLowerCase());
const list = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

function transport(proxy, network, { path, host, serviceName, mode, headerType }) {
  const net = (network || "tcp").toLowerCase();
  if (net === "tcp" || net === "raw") {
    if (headerType === "http") {
      proxy.network = "http";
      proxy["http-opts"] = { path: [path || "/"], ...(host ? { headers: { Host: list(host) } } : {}) };
    }
    return true;
  }
  if (net === "ws" || net === "httpupgrade") {
    proxy.network = "ws";
    proxy["ws-opts"] = { path: path || "/", ...(host ? { headers: { Host: host } } : {}) };
    if (net === "httpupgrade") proxy["ws-opts"]["v2ray-http-upgrade"] = true;
    return true;
  }
  if (net === "grpc") {
    proxy.network = "grpc";
    proxy["grpc-opts"] = { "grpc-service-name": serviceName || path || "" };
    return true;
  }
  if (net === "h2" || net === "http") {
    proxy.network = "h2";
    proxy["h2-opts"] = { path: path || "/", ...(host ? { host: list(host) } : {}) };
    return true;
  }
  if (net === "xhttp" || net === "splithttp") {
    proxy.network = "xhttp";
    proxy["xhttp-opts"] = { path: path || "/", ...(host ? { host } : {}), ...(mode ? { mode } : {}) };
    return true;
  }
  return false;
}

function fromUrl(uri, scheme) {
  const parsed = new URL(uri);
  const q = parsed.searchParams;
  const server = parsed.hostname.replace(/^\[|\]$/g, "");
  const port = Number(parsed.port);
  const user = decodeURIComponent(parsed.username);
  const pass = decodeURIComponent(parsed.password);
  const sni = q.get("sni") || q.get("peer") || q.get("serverName") || "";
  const insecure = truthy(q.get("allowInsecure")) || truthy(q.get("insecure"));
  const alpn = list(q.get("alpn"));
  const fp = q.get("fp") || "";

  if (scheme === "vless" || scheme === "trojan") {
    const proxy = { type: scheme, server, port, udp: true };
    if (scheme === "vless") {
      proxy.uuid = user;
      if (q.get("flow")) proxy.flow = q.get("flow");
      const encryption = q.get("encryption");
      if (encryption && encryption !== "none") return null;
    } else {
      proxy.password = user;
    }
    const security = (q.get("security") || (scheme === "trojan" ? "tls" : "")).toLowerCase();
    if (security === "tls" || security === "reality" || security === "xtls") {
      proxy.tls = true;
      if (sni) proxy[scheme === "trojan" ? "sni" : "servername"] = sni;
    }
    if (security === "reality") {
      if (!q.get("pbk")) return null;
      proxy["reality-opts"] = { "public-key": q.get("pbk"), ...(q.get("sid") ? { "short-id": q.get("sid") } : {}) };
      proxy["client-fingerprint"] = fp || "chrome";
    } else if (fp) proxy["client-fingerprint"] = fp;
    if (alpn.length) proxy.alpn = alpn;
    if (insecure) proxy["skip-cert-verify"] = true;
    const ok = transport(proxy, q.get("type"), {
      path: q.get("path"), host: q.get("host"), serviceName: q.get("serviceName"), mode: q.get("mode"), headerType: q.get("headerType"),
    });
    return ok ? proxy : null;
  }
  if (scheme === "hysteria2" || scheme === "hy2") {
    const proxy = { type: "hysteria2", server, port, password: pass ? `${user}:${pass}` : user, udp: true };
    if (sni) proxy.sni = sni;
    if (q.get("obfs") && q.get("obfs") !== "none") proxy.obfs = q.get("obfs");
    if (q.get("obfs-password")) proxy["obfs-password"] = q.get("obfs-password");
    if (q.get("mport")) proxy.ports = q.get("mport");
    if (alpn.length) proxy.alpn = alpn;
    if (insecure) proxy["skip-cert-verify"] = true;
    return proxy;
  }
  if (scheme === "hysteria") {
    const proxy = { type: "hysteria", server, port, udp: true, "auth-str": q.get("auth") || user || "" };
    proxy.up = q.get("upmbps") || "10";
    proxy.down = q.get("downmbps") || "50";
    if (q.get("protocol")) proxy.protocol = q.get("protocol");
    if (q.get("obfsParam")) proxy.obfs = q.get("obfsParam");
    if (sni) proxy.sni = sni;
    if (alpn.length) proxy.alpn = alpn;
    if (insecure) proxy["skip-cert-verify"] = true;
    return proxy;
  }
  if (scheme === "tuic") {
    const proxy = { type: "tuic", server, port, uuid: user, password: pass, udp: true };
    if (sni) proxy.sni = sni;
    if (alpn.length) proxy.alpn = alpn;
    if (q.get("congestion_control")) proxy["congestion-controller"] = q.get("congestion_control");
    if (q.get("udp_relay_mode")) proxy["udp-relay-mode"] = q.get("udp_relay_mode");
    if (insecure) proxy["skip-cert-verify"] = true;
    return proxy;
  }
  return null;
}

function fromShadowsocks(uri) {
  const body = uri.slice(5).split("#", 1)[0];
  let userInfo;
  let rest;
  const at = body.lastIndexOf("@");
  if (at < 0) {
    const decoded = b64decode(body.split(/[/?]/, 1)[0]);
    const split = decoded.lastIndexOf("@");
    userInfo = decoded.slice(0, split);
    rest = decoded.slice(split + 1) + body.slice(body.split(/[/?]/, 1)[0].length);
  } else {
    userInfo = decodeURIComponent(body.slice(0, at));
    if (!userInfo.includes(":")) userInfo = b64decode(userInfo);
    rest = body.slice(at + 1);
  }
  const parsed = new URL(`ss://x@${rest.replace(/^\/?/, "")}`);
  const colon = userInfo.indexOf(":");
  if (colon < 1) return null;
  const proxy = {
    type: "ss", server: parsed.hostname.replace(/^\[|\]$/g, ""), port: Number(parsed.port),
    cipher: userInfo.slice(0, colon).toLowerCase(), password: userInfo.slice(colon + 1), udp: true,
  };
  const plugin = parsed.searchParams.get("plugin");
  if (plugin) {
    const [name, ...options] = plugin.split(";");
    const opts = Object.fromEntries(options.map((item) => item.split("=")));
    if (/obfs/.test(name)) {
      proxy.plugin = "obfs";
      proxy["plugin-opts"] = { mode: opts.obfs || "http", ...(opts["obfs-host"] ? { host: opts["obfs-host"] } : {}) };
    } else if (/v2ray/.test(name)) {
      proxy.plugin = "v2ray-plugin";
      proxy["plugin-opts"] = { mode: opts.mode || "websocket", ...(opts.host ? { host: opts.host } : {}), ...(opts.path ? { path: opts.path } : {}), ...("tls" in opts ? { tls: true } : {}) };
    } else return null;
  }
  return proxy;
}

function fromShadowsocksR(uri) {
  const decoded = b64decode(uri.slice(6).split("#", 1)[0]);
  const [main, query = ""] = decoded.split("/?");
  const parts = main.split(":");
  if (parts.length < 6) return null;
  const password = b64decode(parts.pop());
  const obfs = parts.pop();
  const cipher = parts.pop();
  const protocol = parts.pop();
  const port = Number(parts.pop());
  const server = parts.join(":");
  const q = new URLSearchParams(query);
  const param = (key) => (q.get(key) ? b64decode(q.get(key)) : "");
  return {
    type: "ssr", server, port, cipher, password, obfs, protocol, udp: true,
    ...(param("obfsparam") ? { "obfs-param": param("obfsparam") } : {}),
    ...(param("protoparam") ? { "protocol-param": param("protoparam") } : {}),
  };
}

function fromVmess(uri) {
  const config = JSON.parse(b64decode(uri.slice(8).split("#", 1)[0]));
  const proxy = {
    type: "vmess", server: String(config.add || ""), port: Number(config.port), uuid: String(config.id || ""),
    alterId: Number(config.aid || 0), cipher: config.scy || "auto", udp: true,
  };
  if (String(config.tls || "").toLowerCase() === "tls") {
    proxy.tls = true;
    if (config.sni || config.host) proxy.servername = config.sni || String(config.host).split(",")[0];
    if (config.fp) proxy["client-fingerprint"] = config.fp;
    if (config.alpn) proxy.alpn = list(config.alpn);
    if (truthy(config.allowInsecure) || truthy(config.insecure)) proxy["skip-cert-verify"] = true;
  }
  const ok = transport(proxy, config.net, { path: config.path, host: config.host, serviceName: config.path, headerType: config.type });
  return ok ? proxy : null;
}

/** Returns a Clash/mihomo proxy object (without name) or null when unsupported. */
export function uriToClash(uri) {
  try {
    const scheme = uri.match(/^([a-z0-9+.-]+):\/\//i)?.[1]?.toLowerCase();
    let proxy = null;
    if (scheme === "ss") proxy = fromShadowsocks(uri);
    else if (scheme === "ssr") proxy = fromShadowsocksR(uri);
    else if (scheme === "vmess") proxy = fromVmess(uri);
    else if (["vless", "trojan", "hysteria2", "hy2", "hysteria", "tuic"].includes(scheme)) proxy = fromUrl(uri, scheme);
    if (!proxy || !proxy.server || !Number.isInteger(proxy.port) || proxy.port < 1 || proxy.port > 65535) return null;
    return proxy;
  } catch {
    return null;
  }
}

const TEST_URL = "https://www.gstatic.com/generate_204";

/** Build a complete mihomo / Clash Meta profile from nodes that carry a `clash` object. */
export function buildClashConfig(nodes) {
  const used = new Set();
  const proxies = [];
  for (const node of nodes) {
    if (!node.clash) continue;
    let name = String(node.name || `${node.protocol} ${node.server}`).slice(0, 80);
    for (let i = 2; used.has(name); i += 1) name = `${String(node.name).slice(0, 76)} #${i}`;
    used.add(name);
    proxies.push({ name, ...node.clash });
  }
  const names = proxies.map((proxy) => proxy.name);
  const auto = "♻️ 自动选择 Auto";
  const fallback = "🛟 故障转移 Fallback";
  const select = "🚀 节点选择 Proxy";
  const config = {
    "mixed-port": 7890,
    "allow-lan": false,
    mode: "rule",
    "log-level": "warning",
    "unified-delay": true,
    "tcp-concurrent": true,
    "geodata-mode": false,
    "geox-url": { mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country-lite.mmdb" },
    dns: {
      enable: true,
      ipv6: false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      nameserver: ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
      fallback: ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"],
      "fallback-filter": { geoip: true, "geoip-code": "CN" },
    },
    proxies,
    "proxy-groups": names.length ? [
      { name: select, type: "select", proxies: [auto, fallback, ...names] },
      { name: auto, type: "url-test", url: TEST_URL, interval: 600, tolerance: 80, lazy: true, proxies: names },
      { name: fallback, type: "fallback", url: TEST_URL, interval: 600, lazy: true, proxies: names },
    ] : [{ name: select, type: "select", proxies: ["DIRECT"] }],
    rules: [
      "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
      "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
      "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
      "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
      "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
      "GEOIP,CN,DIRECT",
      `MATCH,${select}`,
    ],
  };
  return `# NodeScope · ${names.length} proxy-verified nodes · https://node.oinnn.top/\n${stringify(config, { lineWidth: 0, aliasDuplicateObjects: false })}`;
}
