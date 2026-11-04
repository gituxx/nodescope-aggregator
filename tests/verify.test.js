import test from "node:test";
import assert from "node:assert/strict";
import { parseNodeUri } from "../lib/feed.js";
import { buildVerifiedSnapshot, flagEmoji, nodeKey, pruneHistory, scoreNode, setUriLabel, stabilityOf, updateHistory } from "../lib/verify.js";

test("setUriLabel relabels every URI family without changing the endpoint", () => {
  const vmess = `vmess://${Buffer.from(JSON.stringify({ add: "vm.example", port: "443", id: "abc", ps: "old" })).toString("base64")}`;
  const ssr = `ssr://${Buffer.from("ssr.example:443:origin:aes-128-cfb:plain:cGFzcw==/?remarks=b2xk").toString("base64url")}`;
  for (const uri of [vmess, ssr, "vless://id@edge.example:443?security=tls#old", "trojan://pw@relay.example:443"]) {
    const relabeled = setUriLabel(uri, "n42");
    const before = parseNodeUri(uri);
    const after = parseNodeUri(relabeled);
    assert.equal(after.server, before.server);
    assert.equal(after.port, before.port);
    assert.equal(after.identity, before.identity);
  }
  assert.equal(JSON.parse(Buffer.from(setUriLabel(vmess, "n1").slice(8), "base64").toString()).ps, "n1");
  assert.match(setUriLabel("vless://id@edge.example:443#old", "🇯🇵 JP"), /#%F0%9F%87%AF%F0%9F%87%B5%20JP$/);
});

test("canonical identity collapses re-shared nodes with reordered or empty parameters", () => {
  const a = parseNodeUri("vless://id@Edge.Example:443?type=ws&security=tls&path=%2F#one");
  const b = parseNodeUri("vless://id@edge.example:443?security=tls&path=%2F&type=ws&fp=#two");
  assert.equal(a.identity, b.identity);
  assert.equal(parseNodeUri("vless://00000000-0000-0000-0000-000000000000@edge.example:443"), null);
  assert.equal(parseNodeUri("trojan://pw@127.0.0.1:443"), null);
  assert.equal(parseNodeUri("vless://id@edge.example:443?security=reality&amp;pbk=k&amp;sni=a.com").raw, "vless://id@edge.example:443?security=reality&pbk=k&sni=a.com");
  assert.equal(parseNodeUri("trojan://pw@192.168.1.4:443"), null);
});

test("history yields smoothed stability and a bounded score", () => {
  const history = {};
  for (const ok of [true, true, false, true]) updateHistory(history, "k", ok, 120, new Date().toISOString());
  const { stability, observations } = stabilityOf(history.k);
  assert.equal(observations, 4);
  assert.equal(stability, 4 / 6);
  assert.ok(scoreNode({ stability: 1, latencyMs: 100, traced: true, sourcesCount: 9 }) <= 100);
  assert.ok(scoreNode({ stability: 0.9, latencyMs: 200, traced: true }) > scoreNode({ stability: 0.9, latencyMs: 2500, traced: false }));
  history.old = { r: "1", t: "2020-01-01T00:00:00Z" };
  pruneHistory(history);
  assert.equal("old" in history, false);
  assert.equal(flagEmoji("JP"), "🇯🇵");
});

test("verified snapshot keeps only passing nodes, uses exit country and sorts by score", () => {
  const nodes = ["vless://a@one.example:443#x", "vless://b@two.example:443#y", "trojan://c@three.example:443#z"]
    .map(parseNodeUri).map((node) => ({ ...node, source: "s", method: "m", sourcesCount: 1, countryCode: "US", locationSource: "节点名称标识" }));
  const results = new Map([
    [0, { ok: true, latencyMs: 2500, exit: null }],
    [1, { ok: true, latencyMs: 150, exit: { countryCode: "JP", ip: "1.2.3.4" } }],
    [2, { ok: false }],
  ]);
  const history = { [nodeKey(nodes[1].identity)]: { r: "1111", t: new Date().toISOString() } };
  const snapshot = buildVerifiedSnapshot({ collected: { nodes, sources: [] }, results, history, generatedAt: "2026-11-04T00:00:00.000Z", stats: { passed: 2 } });
  assert.equal(snapshot.nodes.length, 2);
  assert.equal(snapshot.nodes[0].server, "two.example");
  assert.equal(snapshot.nodes[0].countryCode, "JP");
  assert.equal(snapshot.nodes[0].locationSource, "出口 IP 测试报告");
  assert.equal(snapshot.nodes[1].countryCode, "US");
  assert.equal(snapshot.nodes.every((node) => node.status === "available" && node.verifiedAt), true);
  assert.equal(parseNodeUri(snapshot.nodes[0].raw).name, snapshot.nodes[0].name);
  assert.equal(snapshot.verification.published, 2);
});

test("snapshot caps nodes per exit IP and rewards throughput", () => {
  const nodes = Array.from({ length: 10 }, (_, i) => parseNodeUri(`vless://id${i}@cdn${i}.example:443#n`))
    .map((node) => ({ ...node, source: "s", method: "m", sourcesCount: 1 }));
  const results = new Map(nodes.map((_, i) => [i, { ok: true, latencyMs: 200, exit: { countryCode: "DE", ip: "5.5.5.5" }, speedMbps: i }]));
  const snapshot = buildVerifiedSnapshot({ collected: { nodes, sources: [] }, results, history: {}, generatedAt: new Date().toISOString(), stats: {} });
  assert.equal(snapshot.nodes.length, 8);
  assert.equal(snapshot.verification.exitDuplicatesRemoved, 2);
  assert.equal(snapshot.nodes[0].speedMbps, 9);
  assert.ok(scoreNode({ stability: 0.8, latencyMs: 300, speedMbps: 40 }) > scoreNode({ stability: 0.8, latencyMs: 300, speedMbps: 0.5 }));
});

test("uriToClash converts the common URI families into mihomo proxies", async () => {
  const { uriToClash, buildClashConfig } = await import("../lib/clash.js");
  const vmess = `vmess://${Buffer.from(JSON.stringify({ add: "vm.example", port: "443", id: "u", aid: "0", net: "ws", path: "/p", host: "h.example", tls: "tls", sni: "s.example" })).toString("base64")}`;
  assert.deepEqual(uriToClash(vmess), { type: "vmess", server: "vm.example", port: 443, uuid: "u", alterId: 0, cipher: "auto", udp: true, tls: true, servername: "s.example", network: "ws", "ws-opts": { path: "/p", headers: { Host: "h.example" } } });
  const reality = uriToClash("vless://id@r.example:443?security=reality&pbk=KEY&sid=ab&sni=www.apple.com&fp=chrome&type=grpc&serviceName=svc&flow=");
  assert.equal(reality["reality-opts"]["public-key"], "KEY");
  assert.equal(reality["grpc-opts"]["grpc-service-name"], "svc");
  assert.equal(uriToClash("vless://id@r.example:443?security=reality&type=tcp"), null);
  assert.equal(uriToClash("trojan://pw%01x@t.example:443"), null);
  const ss = uriToClash(`ss://${Buffer.from("aes-256-gcm:pw").toString("base64")}@ss.example:8388#x`);
  assert.deepEqual([ss.cipher, ss.password, ss.port], ["aes-256-gcm", "pw", 8388]);
  const hy2 = uriToClash("hysteria2://pw@hy.example:443?sni=a.com&obfs=salamander&obfs-password=o&insecure=1");
  assert.deepEqual([hy2.type, hy2.obfs, hy2["skip-cert-verify"]], ["hysteria2", "salamander", true]);
  const yaml = buildClashConfig([{ name: "A", clash: ss }, { name: "A", clash: hy2 }]);
  assert.match(yaml, /name: "A #2"/);
  assert.doesNotMatch(yaml, /&a1|\*a1/);
  assert.match(yaml, /MATCH,🚀 节点选择 Proxy/);
});
