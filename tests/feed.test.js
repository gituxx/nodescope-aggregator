import test from "node:test";
import assert from "node:assert/strict";
import { FEED_SOURCES, parseFeed, parseNodeUri, getCountryName, getProtocolCounts } from "../lib/feed.js";
import { filterSubscription, onRequestGet } from "../functions/api/[[path]].js";

test("parses common public node URI formats without exposing credentials in metadata", () => {
  assert.equal(getCountryName("KZ"), "哈萨克斯坦");
  const vmess = Buffer.from(JSON.stringify({ add: "vmess.example", port: "443", id: "secret" })).toString("base64");
  const entries = [
    `vmess://${vmess}#Tokyo`,
    "vless://uuid@edge.example:8443?type=ws&security=tls#Singapore%20A",
    "trojan://secret@relay.example:443?sni=example.org#London",
    "hysteria2://secret@hy2.example:443?sni=example.org#Fast",
    "tuic://uuid:secret@tuic.example:443?sni=example.org#TUIC",
  ].map(parseNodeUri);

  assert.deepEqual(entries.map((entry) => entry.protocol), ["VMess", "VLESS", "Trojan", "Hysteria2", "TUIC"]);
  assert.equal(entries[0].server, "vmess.example");
  assert.equal(entries[1].port, 8443);
  assert.equal(entries[1].name, "Singapore A");
});

test("decodes Shadowsocks server fields and ignores unsupported or malformed links", () => {
  const auth = Buffer.from("aes-128-gcm:password").toString("base64url");
  const ss = parseNodeUri(`ss://${auth}@ss.example:8388#Japan`);
  const ssrPayload = Buffer.from("ssr.example:443:origin:aes-128-cfb:plain:cGFzcw==/").toString("base64url");
  const ssr = parseNodeUri(`ssr://${ssrPayload}`);

  assert.equal(ss.server, "ss.example");
  assert.equal(ss.protocol, "Shadowsocks");
  assert.equal(ssr.server, "ssr.example");
  assert.equal(ssr.protocol, "ShadowsocksR");
  assert.equal(parseNodeUri("https://example.com/subscription"), null);
  assert.equal(parseNodeUri("vless://not-an-endpoint"), null);
});

test("deduplicates parsed entries and computes protocol counts", () => {
  const snapshot = parseFeed([
    "# generated 2026-10-01T00:00:00Z by test",
    "vless://uuid@edge.example:443#one",
    "vless://uuid@edge.example:443#renamed",
    "trojan://secret@relay.example:443#relay",
  ].join("\n"), "2026-10-01T01:00:00.000Z");

  assert.equal(snapshot.nodes.length, 2);
  assert.equal(snapshot.upstreamGeneratedAt, "2026-10-01T00:00:00Z");
  assert.deepEqual(getProtocolCounts(snapshot.nodes), [
    { protocol: "Trojan", count: 1 },
    { protocol: "VLESS", count: 1 },
  ]);
});

test("decodes a Base64-encoded subscription bundle", () => {
  const raw = "vless://uuid@edge.example:443#edge\nvmess://eyJhZGQiOiJ2bWVzcy5leGFtcGxlIiwicG9ydCI6IjQ0MyJ9#v2\n";
  const encoded = Buffer.from(raw).toString("base64");
  const snapshot = parseFeed(encoded);

  assert.equal(snapshot.nodes.length, 2);
  assert.deepEqual(getProtocolCounts(snapshot.nodes), [
    { protocol: "VLESS", count: 1 },
    { protocol: "VMess", count: 1 },
  ]);
});

test("parses nodes embedded in RSS descriptions", () => {
  const rss = `<rss><channel><item><description><![CDATA[vless://uuid@edge.example:443?type=ws&amp;security=tls#Japan]]></description><link href="trojan://secret@relay.example:443#RSS" /></item></channel></rss>`;
  const snapshot = parseFeed(rss);

  assert.equal(snapshot.nodes.length, 2);
  assert.equal(snapshot.nodes[0].server, "edge.example");
  assert.match(snapshot.nodes[0].raw, /security=tls/);
  assert.equal(snapshot.nodes[1].server, "relay.example");
});

test("converts Telegram Clash YAML proxies to portable node URIs", () => {
  const clash = [
    "proxies:",
    "  - name: Japan relay",
    "    type: trojan",
    "    server: relay.example",
    "    port: 443",
    "    password: secret",
    "    sni: edge.example",
    "    tls: true",
  ].join("\n");
  const snapshot = parseFeed(clash, undefined, "clash");

  assert.equal(snapshot.nodes.length, 1);
  assert.equal(snapshot.nodes[0].protocol, "Trojan");
  assert.equal(snapshot.nodes[0].server, "relay.example");
  assert.match(snapshot.nodes[0].raw, /^trojan:\/\/secret@relay\.example:443/);
});

test("API returns sanitized metadata and a usable Base64 subscription", async () => {
  const originalFetch = globalThis.fetch;
  const stored = new Map();
  const env = { NODESCOPE_DATA: {
    get: async (key, type) => type === "json" ? JSON.parse(stored.get(key) || "null") : stored.get(key),
    put: async (key, value) => { stored.set(key, value); },
  } };
  const vmess = Buffer.from(JSON.stringify({ add: "vmess.example", port: "443", id: "vmess-secret" })).toString("base64");
  const feeds = new Map([
    ["best.txt", "# generated 2026-10-01T00:00:00Z\ntrojan://secret@relay.example:443#relay\nvless://uuid@edge.example:443#edge\n"],
    ["subscription.txt", Buffer.from(`vmess://${vmess}#v2\n`).toString("base64")],
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("report.json")) {
      return Response.json({
        generated_at: "2026-10-01T01:00:00.000Z",
        nodes: [{ type: "vless", server: "edge.example", port: 443, country_code: "JP", latency_ms: 88, error: null }],
      });
    }
    const content = [...feeds.entries()].find(([name]) => url.endsWith(name))?.[1];
    return new Response(content || "not found", { status: content ? 200 : 404 });
  };

  try {
    const nodesResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/nodes"), env });
    const data = await nodesResponse.json();
    assert.equal(nodesResponse.status, 200);
    assert.equal(data.count, 3);
    assert.equal(data.sources.length, FEED_SOURCES.length + 1);
    assert.equal(data.protocols.some((item) => item.protocol === "VMess"), true);
    assert.equal(data.nodes.some((node) => "raw" in node || "identity" in node), false);
    assert.equal(data.nodes.every((node) => Number.isInteger(node.index)), true);
    assert.equal(JSON.stringify(data).includes("vmess-secret"), false);
    const measured = data.nodes.find((node) => node.server === "edge.example");
    assert.equal(measured.status, "available");
    assert.equal(measured.latencyMs, 88);
    assert.equal(measured.countryCode, "JP");
    assert.equal(data.statuses.available, 1);

    const subscriptionResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/subscription?format=base64&profile=all"), env });
    const encoded = await subscriptionResponse.text();
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    assert.match(decoded, /trojan:\/\/secret@relay\.example:443/);
    assert.match(decoded, /vmess:\/\//);

    const japanResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/subscription?format=plain&profile=JP"), env });
    const japan = await japanResponse.text();
    assert.equal(japanResponse.headers.get("X-NodeScope-Count"), "1");
    assert.match(japan, /vless:\/\/uuid@edge\.example:443/);

    const apacResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/subscription?format=plain&profile=apac"), env });
    assert.equal(apacResponse.headers.get("X-NodeScope-Count"), "1");

    const single = await onRequestGet({ request: new Request(`https://node.oinnn.top/api/node?index=${measured.index}&version=${encodeURIComponent(data.fetchedAt)}`), env });
    assert.equal(single.status, 200);
    assert.match(await single.text(), /^vless:\/\/uuid@edge\.example:443/);
    assert.equal(single.headers.get("Cache-Control"), "no-store");
    const outdated = await onRequestGet({ request: new Request(`https://node.oinnn.top/api/node?index=${measured.index}&version=old`), env });
    assert.equal(outdated.status, 409);

    const unlabeled = data.nodes.find((node) => node.server === "relay.example");
    stored.set("probes:v1", JSON.stringify({
      checks: { "relay.example:443": { status: "reachable", latencyMs: 54, checkedAt: new Date().toISOString(), ip: "8.8.8.8" } },
      geo: { "8.8.8.8": "US" },
    }));
    const probed = await (await onRequestGet({ request: new Request("https://node.oinnn.top/api/nodes"), env })).json();
    const updated = probed.nodes.find((node) => node.index === unlabeled.index);
    assert.equal(updated.status, "reachable");
    assert.equal(updated.latencyMs, 54);
    assert.equal(updated.countryCode, "US");
    assert.equal(probed.statuses.reachable, 1);
    assert.equal(probed.countries.some((country) => country.countryCode === "US"), true);
    const us = await onRequestGet({ request: new Request("https://node.oinnn.top/api/subscription?format=plain&country=US"), env });
    assert.equal(us.headers.get("X-NodeScope-Count"), "1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("best100 retains protocol benchmark priority and excludes unverified filler", () => {
  const nodes = [
    { name: "unverified", status: "unknown", latencyMs: null },
    { name: "fast TCP", status: "reachable", latencyMs: 1 },
    { name: "protocol tested", status: "reachable", latencyMs: 90, benchmarkStatus: "available", benchmarkLatencyMs: 80 },
    { name: "failed", status: "failed", benchmarkStatus: "available", latencyMs: null },
    { name: "selected upstream", status: "upstream", latencyMs: null },
  ];
  const selected = filterSubscription(nodes, new URL("https://node.oinnn.top/api/subscription?profile=best100"));
  assert.deepEqual(selected.map((node) => node.name), ["protocol tested", "fast TCP", "selected upstream"]);
});
