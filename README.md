# NodeScope

NodeScope is a Chinese-language dashboard prototype for a public proxy-node aggregator. It includes an overview, sample node table, search and filters, latency and availability sorting, responsive layout, and a client-format subscription dialog.

## Current scope

The dashboard uses clearly labeled sample data. It does not crawl public sources, run health checks, store nodes, or provide importable subscriptions. A production release needs a backend for source intake, protocol parsing, safe connection checks, deduplication, geographic lookup, and subscription serialization. The subscription address shown in the preview is not a live endpoint.

## Local development

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

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
