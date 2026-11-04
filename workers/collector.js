import { refreshAndStore } from "../lib/feed.js";
import { connect } from "cloudflare:sockets";
import { runProbeBatch, testTcp } from "../lib/probe.js";

// Must match the first cron in wrangler.collector.toml. Usually this only pulls the
// proxy-verified snapshot published by GitHub Actions; it self-collects as a fallback.
const REFRESH_CRON = "7 * * * *";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }

    const value = await env.NODESCOPE_DATA.get("snapshot:v3");
    if (!value) return Response.json({ status: "waiting-for-first-run" }, { status: 503 });
    const snapshot = JSON.parse(value);
    return Response.json({
      status: snapshot.stale ? "degraded" : "ready",
      stale: Boolean(snapshot.stale),
      fetchedAt: snapshot.fetchedAt,
      lastAttemptAt: snapshot.lastAttemptAt || snapshot.fetchedAt,
      count: snapshot.nodes?.length || 0,
      sources: snapshot.sources?.length || 0,
      failedSources: snapshot.sources?.filter((source) => source.error).length || 0,
      checkedAt: snapshot.checkedAt || null,
      verified: Boolean(snapshot.verification),
      verification: snapshot.verification || null,
      probeUpdatedAt: (await env.NODESCOPE_DATA.get("probes:v1", "json"))?.updatedAt || null,
    });
  },

  async scheduled(controller, env, context) {
    const task = controller.cron === REFRESH_CRON
      ? refreshAndStore(env)
      : runProbeBatch(env, (node) => testTcp(node, connect));
    context.waitUntil(task.catch((error) => {
      console.error("NodeScope scheduled task failed", error);
    }));
  },
};
