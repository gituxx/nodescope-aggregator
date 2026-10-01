import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, parseNodeUri, getProtocolCounts } from "../lib/feed.js";
import { onRequestGet } from "../functions/api/[[path]].js";

test("parses common public node URI formats without exposing credentials in metadata", () => {
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

test("API returns sanitized metadata and a usable Base64 subscription", async () => {
  const originalFetch = globalThis.fetch;
  const vmess = Buffer.from(JSON.stringify({ add: "vmess.example", port: "443", id: "vmess-secret" })).toString("base64");
  const feeds = new Map([
    ["best.txt", "# generated 2026-10-01T00:00:00Z\ntrojan://secret@relay.example:443#relay\nvless://uuid@edge.example:443#edge\n"],
    ["subscription.txt", Buffer.from(`vmess://${vmess}#v2\n`).toString("base64")],
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    const content = [...feeds.entries()].find(([name]) => url.endsWith(name))?.[1];
    return new Response(content || "not found", { status: content ? 200 : 404 });
  };

  try {
    const nodesResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/nodes") });
    const data = await nodesResponse.json();
    assert.equal(nodesResponse.status, 200);
    assert.equal(data.count, 3);
    assert.equal(data.sources.length, 2);
    assert.equal(data.protocols.some((item) => item.protocol === "VMess"), true);
    assert.equal(data.nodes.some((node) => "raw" in node || "identity" in node), false);
    assert.equal(JSON.stringify(data).includes("vmess-secret"), false);

    const subscriptionResponse = await onRequestGet({ request: new Request("https://node.oinnn.top/api/subscription?format=base64") });
    const encoded = await subscriptionResponse.text();
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    assert.match(decoded, /trojan:\/\/secret@relay\.example:443/);
    assert.match(decoded, /vmess:\/\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
