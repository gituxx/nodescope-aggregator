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
npx wrangler pages project create nodescope-aggregator --production-branch main
npm run build
npm run deploy:cloudflare
```

After the first deployment, open the Pages project **Custom domains** and add `node.oinnn.top`. Complete this Pages step before adding a DNS record. If `oinnn.top` is managed in the same Cloudflare account, Cloudflare can create the required DNS record. Never commit API keys or other credentials.

## License

MIT. See [LICENSE](./LICENSE).
