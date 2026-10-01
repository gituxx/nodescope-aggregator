# NodeScope

**A public proxy-node directory with transparent source, location, and connectivity evidence.** NodeScope combines open feeds into a searchable directory and lets visitors create subscription links by protocol, region, and country. It is a data index, not a VPN provider, and it does not operate or endorse listed servers.

**Languages:** English · [简体中文](README.zh-CN.md) · [فارسی](README.fa.md) · [Русский](README.ru.md) · [မြန်မာ](README.my.md)

Live site: [node.oinnn.top](https://node.oinnn.top/) · [Downloads](https://node.oinnn.top/downloads/) · [Source submissions](https://github.com/gituxx/nodescope-aggregator/issues/new?title=%5BSource%5D%20)

## What it does

- Aggregates public VLESS, VMess, Shadowsocks, Trojan, and other supported configurations from independent feeds.
- Searches and filters nodes by protocol, region, country, reported state, and observed entry latency.
- Builds Base64 or raw-URI subscriptions from all nodes, the top 100, a region, a country, or a combination of filters.
- Copies an individual node URI without exposing raw credentials through the general node-list API.
- Provides a multilingual, platform-filterable index of open-source desktop and mobile clients.
- Labels where location and status information came from, and explains the limits of each signal.

## Collection and resilience

Collection uses several independent paths so that one repository or feed going offline does not remove the entire directory:

- GitHub project aggregators and repositories, including [MatinGhanbari/v2ray-configs](https://github.com/MatinGhanbari/v2ray-configs), [0xRadikal/Free-v2ray-Configs](https://github.com/0xRadikal/Free-v2ray-Configs), [Alirewa/V2ray-Configs](https://github.com/Alirewa/V2ray-Configs), [freenodess/freenodess](https://github.com/freenodess/freenodess), [morpheusadam/v2ray-config](https://github.com/morpheusadam/v2ray-config), [yuesuizhengrong/proxy-node-collector](https://github.com/yuesuizhengrong/proxy-node-collector), [Nexus-nodes](https://github.com/ninjastrikers/Nexus-nodes), [Au1rxx/free-vpn-subscriptions](https://github.com/Au1rxx/free-vpn-subscriptions), and [Free-Nodes](https://github.com/735754647/Free-Nodes).
- A public subscription directory at [OpenProxyList](https://openproxylist.com/), a public Telegram-channel mirror from [mfbpn/tg_mfbpn_sub](https://github.com/mfbpn/tg_mfbpn_sub), and FreeNodeBiz's public featured-subscription endpoint.
- Country-specific subscription shards for Japan, South Korea, the United States, Hong Kong, Singapore, Taiwan, Australia, India, Canada, the United Kingdom, Germany, France, and the Netherlands.
- Base64 and raw-URI subscription parsing, Clash YAML proxy parsing, and RSS/Atom item extraction, followed by identity-based deduplication.

The scheduled Cloudflare Worker refreshes feeds every four hours and probes up to 20 unique TCP endpoints every two minutes. GitHub Raw feeds retry through jsDelivr; collection slots are shared across project owners. Results and probe state are stored in Cloudflare KV. If a scheduled snapshot is missing, the Pages Function can collect on demand. A failed refresh or sharp drop in node count preserves the last good snapshot, records source failures, and throttles retries. Retained snapshots can be served stale for up to seven days; individual probe results expire after 12 hours.

New source suggestions are submitted through GitHub Issues and reviewed before being configured. User-submitted URLs are **not fetched automatically**.

## Understanding the data

- `reachable`: Cloudflare established a TCP connection to the node's entry host and port. This does not test a proxy handshake, authentication, routing, or exit.
- `available`: an upstream project published a recent benchmark result. It is not a NodeScope protocol test.
- `upstream`: the upstream source selected or marked the node; NodeScope has not independently validated it.
- `failed`: the TCP entry check failed. Known Cloudflare-restricted destinations and protocols that cannot be checked with TCP are marked unsupported instead.
- `unknown` / `unsupported`: there is no current result or the probe method does not apply.
- Country labels can come from an upstream exit-IP report, a country feed, a country token in the node name, or entry-IP geolocation. **An entry-IP country is not the proxy exit country.** The interface keeps the evidence source visible.
- Latency is TCP connection time from Cloudflare to an entry point, not end-to-end proxy latency or a guarantee of service quality.

## Subscription API

```text
GET /api/subscription?format=base64&profile=all
GET /api/subscription?format=plain&profile=best100
GET /api/subscription?format=base64&profile=all&protocol=VLESS&region=apac&country=JP&country=KR
```

`format` accepts `base64` or `plain`. `profile` accepts `all`, `best100`, `apac`, `west`, or a country code present in the current snapshot. `region` accepts `apac`, `europe`, `americas`, or `west`. Repeated `protocol` and `country` parameters are supported; selected protocol, region, and country constraints are intersected. A country code can also be used as `profile=JP` for older links.

Other public endpoints:

- `GET /api/nodes` returns node metadata, source health, and status/country counts. Raw node URIs and credentials are omitted.
- `GET /api/node?index=N&version=SNAPSHOT_TIME` returns one URI for copying. The snapshot version prevents a stale row from copying a different node.
- `GET /api/stats` returns summary metadata.

## Languages, downloads, and SEO

The interface and public download directory are available at stable language URLs: `/` (Chinese), `/en/`, `/fa/`, `/ru/`, and `/my/`. Each language has a corresponding `/downloads/` page. The build emits localized titles, descriptions, canonical URLs, reciprocal `hreflang` links, structured data, and a multilingual sitemap. Persian uses right-to-left layout. The site does not redirect visitors by IP; the language can be selected manually.

The download directory links to official project releases for v2rayN, Clash Verge Rev, FlClash, Hiddify, v2rayNG, NekoBox, and Karing. Always verify the release and package against the upstream project before installing.

## Local development

Requires a current Node.js LTS release and npm.

```sh
npm install
npm run dev
npm run build
```

`npm run build` creates Cloudflare Pages output in `dist/`, including localized static routes and `sitemap.xml`. Use `npm run dev:pages` to exercise Pages Functions locally with Wrangler. `npm test` runs the Node test suite.

## Cloudflare deployment

The public site is hosted on Cloudflare Pages using Direct Upload. A scheduled Cloudflare Worker runs the collector. Configure the `NODESCOPE_DATA` KV namespace for the Pages project and collector, then add `node.oinnn.top` under the Pages project's custom domains.

```sh
npx wrangler login
npm run build
npm run deploy:cloudflare
npm run deploy:collector
```

The source repository is public. Never commit Cloudflare API keys, GitHub personal access tokens, private feed URLs, or node subscription credentials. Use Wrangler's authenticated session or scoped secrets for deployment.

## Contributing

Open an issue to suggest a public source, report a broken feed, or discuss a change. Include its public URL, source type, update frequency, and license/permission information. Do not submit private subscription links, access tokens, or sources that expose personal data. Sources are reviewed before they are enabled.

## Safety and acceptable use

Public node configurations may be operated by unknown third parties, changed without notice, or monitored. Do not use them for accounts, payments, private communications, or other sensitive traffic. Prefer trusted providers and follow the laws and network rules that apply where you are. NodeScope does not promise availability, privacy, anonymity, or security.

## License

MIT. See [LICENSE](LICENSE).
