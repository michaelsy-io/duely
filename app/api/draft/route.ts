import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { draftForClient, DraftError } from "@/lib/ai/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { client_code, period?, tone?, channel? } → draft one message (pending supervisor approval). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { client_code?: string; period?: string; tone?: string; channel?: string };
  if (!body.client_code) return NextResponse.json({ error: "client_code required" }, { status: 400 });
  const period = await resolvePeriod(body.period);
  const tone = body.tone === "friendly" || body.tone === "firm" || body.tone === "final" ? body.tone : undefined;
  const channel = body.channel === "sms" ? "sms" : body.channel === "email" ? "email" : undefined;
  try {
    const draft = await draftForClient(period, body.client_code.trim().toUpperCase(), { tone, channel });
    return NextResponse.json({ draft });
  } catch (e) {
    const status = e instanceof DraftError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
