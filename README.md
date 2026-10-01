# NodeScope

NodeScope is a Chinese-language dashboard for a public proxy-node catalog. The Pages Function synchronizes a public, third-party URI bundle on demand and caches the last snapshot for four hours.

## Current scope

The current feed combines [`morpheusadam/v2ray-config`'s `best` bundle](https://github.com/morpheusadam/v2ray-config) and [`yuesuizhengrong/proxy-node-collector`](https://github.com/yuesuizhengrong/proxy-node-collector)'s Base64 subscription. The source bundles are already aggregated and checked by their maintainers; NodeScope does not independently test endpoints. The parser accepts Shadowsocks, ShadowsocksR, VMess, VLESS, Trojan, Hysteria, Hysteria2, TUIC, and WireGuard URIs and removes duplicates.

The public API is served by Cloudflare Pages Functions:

- `GET /api/nodes` returns parsed node metadata without credentials.
- `GET /api/stats` returns source and protocol counts.
- `GET /api/subscription?format=base64` returns a Base64 URI subscription; `format=plain` returns raw URIs.

The subscription endpoint contains credentials from the upstream public feed by design. Public proxy operators are third parties; do not send sensitive traffic through them. NodeScope does not yet perform its own availability checks or IP geolocation, so latency, online rate, and country are intentionally not presented as verified facts. The upstream bundle is refreshed daily; NodeScope checks it when the four-hour edge snapshot expires and a request arrives. If a refresh fails, the last cached snapshot may be served for up to seven days.

## Local development

```sh
npm install
npm run dev
```

For local testing of Pages Functions, run `npm run dev:pages` and open the Wrangler URL (by default, `http://localhost:8788`). Run parser tests with `npm test`, and create a production build with `npm run build`.

## Deploy to Cloudflare Pages

This project uses Pages Direct Upload. Direct Upload is separate from the public GitHub source repository and does not automatically deploy new GitHub commits.

```sh
npx wrangler login
npx wrangler pages project create nodescope-aggregator --production-branch main --force
npm run build
npm run deploy:cloudflare
```

The `--force` flag keeps first-time creation on Pages Direct Upload with current Wrangler versions. After the first deployment, open the Pages project **Custom domains** and add `node.oinnn.top` before creating its CNAME to `nodescope-aggregator.pages.dev`. Never commit API keys or other credentials.

## License

MIT. See [LICENSE](./LICENSE).
