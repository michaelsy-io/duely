// @ts-nocheck -- Deno edge function; excluded from the Next.js type-check.
// Edge function: POST { input: string | string[] } -> { embeddings: number[][] }
// Uses Supabase's built-in gte-small model (384 dims), mean pooled + normalized.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// deno-lint-ignore no-explicit-any
const session = new (globalThis as any).Supabase.ai.Session("gte-small");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405, headers: cors });
  }
  try {
    const { input } = await req.json();
    const texts: string[] = Array.isArray(input) ? input : [input];
    if (!texts.length || texts.some((t) => typeof t !== "string")) {
      return Response.json({ error: "input must be a string or string[]" }, { status: 400, headers: cors });
    }
    if (texts.length > 64) {
      return Response.json({ error: "max 64 inputs per call" }, { status: 400, headers: cors });
    }
    const embeddings: number[][] = [];
    for (const t of texts) {
      const out = await session.run(t.slice(0, 2000), { mean_pool: true, normalize: true });
      embeddings.push(Array.from(out as ArrayLike<number>));
    }
    return Response.json({ embeddings }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500, headers: cors });
  }
});
