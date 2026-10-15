import { NextResponse } from "next/server";

/** n8n hooks: require x-hook-secret === HOOK_SECRET. Refuses when HOOK_SECRET is unset (fail closed). */
export function checkHookSecret(req: Request): NextResponse | null {
  const secret = process.env.HOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "HOOK_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("x-hook-secret") !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
