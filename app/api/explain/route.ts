import { NextResponse } from "next/server";
import { followUpRow, resolvePeriod } from "@/lib/ai/context";
import { explainRow } from "@/lib/ai/agents/explain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?client_code=C014&period= → 1–2 sentence explanation of the follow-up row (never changes the score). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const code = (sp.get("client_code") ?? "").toUpperCase();
  const period = await resolvePeriod(sp.get("period"));
  const row = followUpRow(period, code);
  if (!row) return NextResponse.json({ error: `${code} is not on the follow-up list` }, { status: 404 });
  return NextResponse.json({ client_code: code, period, ...(await explainRow(row)) });
}
