import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { runMonthAgents } from "@/lib/ai/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST { period?, limit? } → draft for the top-N follow-up rows (all go to approvals). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { period?: string; limit?: number };
  const period = await resolvePeriod(body.period);
  const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 25);
  try {
    return NextResponse.json(await runMonthAgents(period, limit));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
