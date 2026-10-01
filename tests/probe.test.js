import test from "node:test";
import assert from "node:assert/strict";
import { mergeProbes, probeKey, runProbeBatch, testTcp } from "../lib/probe.js";

test("TCP checks distinguish reachable, unsupported and failed endpoints", async () => {
  const node = { protocol: "VLESS", server: "edge.example.com", port: 443 };
  const reachable = await testTcp(node, () => ({ opened: Promise.resolve({ remoteAddress: "8.8.8.8:443" }), close: async () => {} }));
  assert.equal(reachable.status, "reachable");
  assert.equal(reachable.ip, "8.8.8.8");
  const udp = await testTcp({ ...node, protocol: "Hysteria2" }, () => { throw new Error("should not connect"); });
  assert.equal(udp.status, "unsupported");
  const privateIp = await testTcp({ ...node, server: "127.0.0.1" }, () => { throw new Error("should not connect"); });
  assert.equal(privateIp.status, "unsupported");
  const blocked = await testTcp(node, () => ({ opened: Promise.reject(new Error("disallowed address")), close: async () => {} }));
  assert.equal(blocked.status, "unsupported");
  const failed = await testTcp(node, () => ({ opened: Promise.reject(new Error("connection refused")), close: async () => {} }));
  assert.equal(failed.status, "failed");
});

test("scheduled batches reuse endpoint checks and enrich only unknown locations", async () => {
  const nodes = [
    { protocol: "VLESS", server: "relay.example.com", port: 443, countryCode: null, status: "unknown" },
    { protocol: "Trojan", server: "relay.example.com", port: 443, countryCode: "JP", country: "日本", status: "available" },
  ];
  const values = new Map([["snapshot:v3", JSON.stringify({ nodes })]]);
  const env = { NODESCOPE_DATA: {
    get: async (key, type) => type === "json" ? JSON.parse(values.get(key) || "null") : values.get(key),
    put: async (key, value) => { values.set(key, value); },
  } };
  let tested = 0;
  const result = await runProbeBatch(env, async () => {
    tested += 1;
    return { status: "reachable", latencyMs: 42, checkedAt: new Date().toISOString(), ip: "8.8.8.8" };
  }, async () => [["8.8.8.8", "US"]], async (hosts) => hosts.map((host) => [host, "8.8.8.8"]));
  assert.equal(result.checked, 1);
  assert.equal(tested, 1);
  const state = JSON.parse(values.get("probes:v1"));
  const merged = mergeProbes(nodes, state);
  assert.equal(merged[0].countryCode, "US");
  assert.equal(merged[0].locationSource, "入口 IP 地理库");
  assert.equal(merged[0].status, "reachable");
  assert.equal(merged[0].latencyMs, 42);
  assert.equal(merged[1].countryCode, "JP");
  assert.equal(state.dns["relay.example.com"].ip, "8.8.8.8");
  assert.equal(probeKey(nodes[0]), probeKey(nodes[1]));
  assert.equal((await runProbeBatch(env, async () => { throw new Error("unexpected retest"); }, async () => [], async () => [])).checked, 0);
});

test("UDP nodes never inherit a TCP connection result for the same endpoint", () => {
  const tcp = { protocol: "VLESS", server: "relay.example.com", port: 443, status: "unknown" };
  const udp = { ...tcp, protocol: "Hysteria2" };
  const state = { checks: { [probeKey(tcp)]: { status: "reachable", latencyMs: 12, checkedAt: new Date().toISOString() } } };
  const nodes = mergeProbes([tcp, udp], state);
  assert.equal(nodes[0].status, "reachable");
  assert.equal(nodes[1].status, "unknown");
  assert.equal(nodes[1].probeStatus, undefined);
});

test("missing geolocation results yield to the next batch and old hosts are pruned", async () => {
  const nodes = Array.from({ length: 61 }, (_, index) => ({ protocol: "VLESS", server: `8.8.8.${index + 1}`, port: 443 }));
  const values = new Map([
    ["snapshot:v3", JSON.stringify({ nodes })],
    ["probes:v1", JSON.stringify({ checks: {}, geo: { "9.9.9.9": "US" }, dns: { "removed.example.com": { ip: "9.9.9.9" } } })],
  ]);
  const env = { NODESCOPE_DATA: {
    get: async (key) => JSON.parse(values.get(key) || "null"),
    put: async (key, value) => { values.set(key, value); },
  } };
  const tester = async () => ({ status: "unsupported", checkedAt: new Date().toISOString() });
  const batches = [];
  const geolocate = async (ips) => { batches.push(ips); return []; };
  await runProbeBatch(env, tester, geolocate, async () => []);
  await runProbeBatch(env, tester, geolocate, async () => []);
  assert.equal(batches[0].length, 60);
  assert.deepEqual(batches[1], ["8.8.8.61"]);
  const state = JSON.parse(values.get("probes:v1"));
  assert.equal(state.geo["9.9.9.9"], undefined);
  assert.equal(state.dns["removed.example.com"], undefined);
});
