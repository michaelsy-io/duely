import { NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/ai/context";
import { buildDigest, notifyDigest } from "@/lib/ai/digest";
import { checkHookSecret } from "@/lib/ai/hookAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** n8n: POST (x-hook-secret) { period?, notify? } → morning digest per collector + notifications. */
export async function POST(req: Request) {
  const denied = checkHookSecret(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { period?: string; notify?: boolean };
  const period = await resolvePeriod(body.period ?? new URL(req.url).searchParams.get("period"));
  const digest = buildDigest(period);
  const notifications = body.notify === false ? 0 : await notifyDigest(digest);
  return NextResponse.json({ ...digest, notifications });
}
