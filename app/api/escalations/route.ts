import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { engine, normalizePeriod } from "@/lib/ai/context";
import { preloadImports } from "@/lib/imports/load";
import { getSession } from "@/lib/session";
import {
  ESC_COOKIE_PREFIX,
  canDecideEscalations,
  isDecisionKind,
  parseDecisionCookie,
  saveEscalationDecision,
  type EscalationDecision,
} from "@/lib/db/escalations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { period, client_code, decision: "approved" | "dismissed" | "open" }
 * Records a person's decision on an engine-recommended escalation. Supervisor, CFO or Admin only.
 * Saved to Supabase (escalation_decisions); if that table is not there, kept in a cookie for this browser.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!canDecideEscalations(session.role)) {
    return NextResponse.json({ error: "Only a supervisor, CFO or admin can decide escalations" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { period?: string; client_code?: string; decision?: string };
  await preloadImports(); // so an imported month ("2026-10") is recognised
  const period = normalizePeriod(body.period);
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
  if (!isDecisionKind(body.decision)) return NextResponse.json({ error: "decision must be approved, dismissed or open" }, { status: 400 });
  const code = String(body.client_code ?? "").trim().toUpperCase();
  const esc = engine(period).escalations.find((e) => e.client_code === code);
  if (!esc) return NextResponse.json({ error: `${code || "Client"} has no escalation in ${period}` }, { status: 404 });

  const decision: EscalationDecision = {
    client_code: code,
    action: esc.action,
    decision: body.decision,
    decided_by: session.roleLabel,
    decided_role: session.role,
    decided_at: new Date().toISOString(),
  };

  const saved = await saveEscalationDecision(period, decision);
  if (saved) return NextResponse.json({ decision: saved, store: "db" });

  // Fallback: no shared table yet. Keep it in this browser so the demo still works.
  const name = `${ESC_COOKIE_PREFIX}${period}`;
  const jar = await cookies();
  const all = parseDecisionCookie(jar.get(name)?.value);
  all[code] = decision;
  const res = NextResponse.json({ decision, store: "cookie" });
  res.cookies.set(name, JSON.stringify(all), { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  return res;
}
