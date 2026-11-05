// Subscription filtering shared by the API and the browser (live match preview).
// Keep dependency-free so it can be bundled into the frontend.
import { AMERICAS, ASIA_PACIFIC, EUROPE } from "./regions.js";

export function filterSubscription(nodes, url) {
  const params = url.searchParams;
  const profile = (params.get("profile") || "all").toLowerCase();
  const values = (key) => [...new Set(params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];
  const countries = values("country").map((value) => value.toUpperCase());
  const protocols = [...values("protocol"), ...values("protocols")];
  const selectedRegion = (params.get("region") || "all").toLowerCase();
  const countryCodes = new Set(nodes.map((node) => node.countryCode).filter(Boolean));
  const knownProtocols = new Map(nodes.filter((node) => typeof node.protocol === "string" && node.protocol).map((node) => [node.protocol.toLowerCase(), node.protocol]));
  const selectedProtocols = protocols.map((value) => knownProtocols.get(value.toLowerCase()));
  const profileCountry = /^[a-z]{2}$/.test(profile) ? profile.toUpperCase() : "";
  const validProfiles = new Set(["all", "best100", "verified", "apac", "west"]);

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

  if (profile === "verified") selected = selected.filter((node) => node.verifiedAt && node.status === "available");
  if (profile === "best100" || profile === "verified") {
    const order = { available: 0, reachable: 1, upstream: 2 };
    const rank = (node) => node.benchmarkStatus === "available" ? 0 : order[node.status] ?? 3;
    const latency = (node) => node.benchmarkLatencyMs ?? node.latencyMs ?? Number.MAX_SAFE_INTEGER;
    selected = [...selected]
      .filter((node) => node.status !== "failed" && (node.benchmarkStatus === "available" || node.status in order))
      .sort((a, b) => rank(a) - rank(b)
        || (b.score ?? -1) - (a.score ?? -1)
        || latency(a) - latency(b)
        || String(a.name).localeCompare(String(b.name), "zh-CN"));
    if (profile === "best100") {
      // Spread the top list across countries so one region cannot monopolise it.
      const perCountry = new Map();
      const picked = [];
      const overflow = [];
      for (const node of selected) {
        const key = node.countryCode || "??";
        const count = perCountry.get(key) || 0;
        if (count < 25) { perCountry.set(key, count + 1); picked.push(node); } else overflow.push(node);
        if (picked.length >= 100) break;
      }
      selected = [...picked, ...overflow].slice(0, 100);
    }
  }
  return selected;
}
