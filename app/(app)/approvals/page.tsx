import type { Metadata } from "next";
import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS } from "@/lib/session";
import { clientName } from "@/lib/clients";
import { peso } from "@/lib/format";
import { ApprovalsQueue } from "./ApprovalsQueue";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const [{ period, result }, session] = await Promise.all([getCurrentResult(), getSession()]);
  const names = Object.fromEntries(result.followUp.map((r) => [r.client_code, { name: clientName(r.client_code), overdue: peso(r.overdue), days: r.oldestDays }]));
  const holds = result.escalations.map((e) => ({ code: e.client_code, name: clientName(e.client_code), action: e.recommendedAction, trigger: e.triggerText, approver: e.approver }));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Approvals</h1>
        <p className="mt-2 text-fg-muted">Nothing reaches a client without a person saying yes. Final notices also need top management. As of {PERIODS[period].label}.</p>
      </div>
      <ApprovalsQueue period={period} role={session.role} by={session.roleLabel} names={names} escalations={holds} />
    </div>
  );
}
