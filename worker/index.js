// Cloudflare Worker entry point.
// Serves the built static app (dist/, via the ASSETS binding) and handles
// POST /api/analyze by proxying to the Anthropic API so the key never reaches
// the browser. Set ANTHROPIC_API_KEY as a Secret in the Cloudflare dashboard.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/analyze") {
      return handleAnalyze(request, env);
    }
    // Everything else is the static site (index.html, favicon, …).
    return env.ASSETS.fetch(request);
  },
};

async function handleAnalyze(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { system, message } = payload;
  if (typeof system !== "string" || typeof message !== "string") {
    return Response.json(
      { error: "Expected { system, message } strings" },
      { status: 400 }
    );
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: message }],
    }),
  });

  // Pass the Anthropic response through unchanged; the client reads
  // data.content[…].text, so the shape must match a raw messages response.
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
