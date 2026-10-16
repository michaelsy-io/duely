import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS, getMonthSelection } from "@/lib/session";
import { clientName } from "@/lib/clients";
import { peso } from "@/lib/format";
import { listDrafts } from "@/lib/db/drafts";
import { ensureDemoDrafts } from "@/lib/db/seedDrafts";
import { ESC_COOKIE_PREFIX, canDecideEscalations, listEscalationDecisions, parseDecisionCookie, type DecisionStore } from "@/lib/db/escalations";
import { ApprovalsQueue, type Draft, type EscDecision } from "./ApprovalsQueue";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const sel = await getMonthSelection();
  if (!sel.period) return <EmptyMonth variant="approvals" sel={sel} canImport={(await getSession()).role === "admin"} />;
  const [{ period, result }, session, sp] = await Promise.all([getCurrentResult(), getSession(), searchParams]);
  // Demo seed: a period with no drafts at all gets a few waiting ones (only when Supabase is reachable).
  const seeded = await ensureDemoDrafts(period).catch(() => 0);
  // Load drafts on the server so the page arrives filled in, with no client-side "Loading drafts" flash.
  const [initialDrafts, dbDecisions] = await Promise.all([
    listDrafts(period).catch(() => null) as Promise<Draft[] | null>,
    listEscalationDecisions(period).catch(() => null),
  ]);
  const store: DecisionStore = dbDecisions ? "db" : "cookie";
  const decisions: Record<string, EscDecision> = dbDecisions
    ? Object.fromEntries(dbDecisions.map((d) => [d.client_code, d]))
    : parseDecisionCookie((await cookies()).get(`${ESC_COOKIE_PREFIX}${period}`)?.value);
  const names = Object.fromEntries(result.followUp.map((r) => [r.client_code, { name: clientName(r.client_code), overdue: peso(r.overdue), days: r.oldestDays }]));
  const holds = result.escalations.map((e) => ({ code: e.client_code, name: clientName(e.client_code), action: e.recommendedAction, trigger: e.triggerText, approver: e.approver }));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Approvals</h1>
        <p className="mt-2 text-fg-muted">Nothing reaches a client without a person saying yes. Final notices also need top management. As of {PERIODS[period].label}.</p>
      </div>
      <ApprovalsQueue
        initialDrafts={initialDrafts}
        initialSelected={typeof sp.draft === "string" ? sp.draft : null}
        seeded={seeded}
        period={period}
        role={session.role}
        by={session.roleLabel}
        names={names}
        escalations={holds}
        decisions={decisions}
        decisionStore={store}
        canDecide={canDecideEscalations(session.role)}
      />
    </div>
  );
}
