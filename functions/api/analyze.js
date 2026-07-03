// Cloudflare Pages Function: POST /api/analyze
// Proxies the weight-trend analysis to the Anthropic API so the key stays
// server-side. Set ANTHROPIC_API_KEY in the Cloudflare Pages dashboard
// (Settings → Environment variables, encrypt it).
import Anthropic from "@anthropic-ai/sdk";

export async function onRequestPost({ request, env }) {
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

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: message }],
    });
    return Response.json(msg);
  } catch (err) {
    return Response.json(
      { error: err?.message || "Upstream API error" },
      { status: err?.status || 502 }
    );
  }
}
