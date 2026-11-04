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
