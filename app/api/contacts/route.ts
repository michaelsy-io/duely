import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { logContactTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { client_code, channel, outcome, promise_amount?, promise_date?, note?, logged_by?, period? } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = logContactTool.inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid contact", issues: parsed.error.issues }, { status: 400 });
  const period = await resolvePeriod(parsed.data.period);
  return NextResponse.json(await logContactTool.execute(parsed.data, { period }));
}
