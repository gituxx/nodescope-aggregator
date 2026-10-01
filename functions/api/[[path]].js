import { getFeedSnapshot, getProtocolCounts } from "../../lib/feed.js";

const headers = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  let snapshot;
  try {
    snapshot = await getFeedSnapshot(request);
  } catch (error) {
    return json({ error: "暂时无法获取上游节点数据", detail: error.message }, 503);
  }

  const nodes = snapshot.nodes;
  const protocols = getProtocolCounts(nodes);
  const metadata = {
    sources: snapshot.sources,
    fetchedAt: snapshot.fetchedAt,
    upstreamGeneratedAt: snapshot.upstreamGeneratedAt,
    stale: Boolean(snapshot.stale),
    refreshError: snapshot.refreshError || null,
    count: nodes.length,
    protocols,
  };

  if (route === "nodes") {
    return json({
      ...metadata,
      nodes: nodes.map(({ identity, raw, ...node }) => node),
    });
  }
  if (route === "stats") return json(metadata);
  if (route === "subscription") {
    const lines = nodes.map((node) => node.raw).join("\n") + "\n";
    const format = url.searchParams.get("format") === "plain" ? "plain" : "base64";
    const body = format === "plain" ? lines : encodeBase64(lines);
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="nodescope.${format === "plain" ? "txt" : "b64"}"`,
      },
    });
  }

  return json({ error: "API 路径不存在" }, 404);
}
