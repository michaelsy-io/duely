import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { buildDue, notifyDue } from "@/lib/ai/digest";
import { checkHookSecret } from "@/lib/ai/hookAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** n8n: POST (x-hook-secret) { period?, notify? } → PDCs due within 2 days + promises due today. */
export async function POST(req: Request) {
  const denied = checkHookSecret(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { period?: string; notify?: boolean };
  const period = await resolvePeriod(body.period ?? new URL(req.url).searchParams.get("period"));
  const due = buildDue(period);
  const notifications = body.notify === false ? 0 : await notifyDue(due);
  return NextResponse.json({ ...due, notifications, hasItems: due.pdcsDue.length + due.promisesDueToday.length > 0 });
}
