import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { cfoSummary } from "@/lib/ai/agents/summarize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?period= → CFO summary (AI words, engine numbers, verified; template when no key). */
export async function GET(req: Request) {
  const period = await resolvePeriod(new URL(req.url).searchParams.get("period"));
  try {
    return NextResponse.json(await cfoSummary(period));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
