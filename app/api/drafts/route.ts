import { NextResponse } from "next/server";
import { listDrafts } from "@/lib/db/drafts";
import { normalizePeriod } from "@/lib/ai/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?period=P1|P2 → drafts (all periods when omitted). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("period");
  const period = p ? normalizePeriod(p) ?? p : undefined;
  return NextResponse.json({ drafts: await listDrafts(period) });
}
