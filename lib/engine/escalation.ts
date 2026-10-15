// Escalation ladder: credit-hold reviews, visits, and credit-limit reviews.
import type { EscalationRow, FollowUpRow } from "./types";
import { ESCALATION } from "./rules";
import type { Model } from "./model";
import type { Base } from "./aging";
import type { OdEntry } from "./score";
import { peso } from "./format";

export interface EscalationRowPlus extends EscalationRow {
  /** Trigger text exactly as the reference report prints it. */
  triggerText: string;
  recommendedAction: string;
  approver: string;
}

export function computeEscalations(m: Model, b: Base, followUp: FollowUpRow[], od: Map<string, OdEntry>): EscalationRowPlus[] {
  const { cut } = m;
  const out: EscalationRowPlus[] = [];
  for (const { client_code: c } of followUp) {
    const o = Math.trunc(od.get(c)!.oldest);
    const unrep7 = b.bouncedOpen.filter((x) => x.client_code === c && x.date_returned !== null && cut - x.date_returned > ESCALATION.bouncedUnreplacedDays);
    const pr = m.act.filter(
      (a) => a.client_code === c && (a.outcome ?? "").startsWith(ESCALATION.brokenPromiseOutcomePrefix) && a.activity_date > cut - ESCALATION.brokenPromiseWindowDays,
    );
    const trig: string[] = [];
    if (o > ESCALATION.creditHoldDays) trig.push("90+ days overdue");
    if (pr.length >= ESCALATION.creditHoldBrokenPromises) trig.push(`${pr.length} broken promises (90 days)`);
    if (unrep7.length) trig.push("bounced check unreplaced > 7 days");
    if (trig.length) {
      out.push({ client_code: c, action: "Credit hold", triggers: trig, triggerText: trig.join("; "), recommendedAction: "Credit-hold review", approver: ESCALATION.creditHoldApprover });
    } else if (o > ESCALATION.visitDays || pr.length === 1) {
      const t = o > ESCALATION.visitDays ? "61-90 days" : "one broken promise";
      out.push({ client_code: c, action: "Visit", triggers: [t], triggerText: t, recommendedAction: "Visit; inform sales rep", approver: ESCALATION.visitApprover });
    }
  }
  for (const [c, bal] of b.balTotal) {
    const lim = m.cust.get(c)?.credit_limit ?? NaN;
    if (bal > lim && !od.has(c)) {
      const t = `Over credit limit (${peso(bal)} vs ${peso(lim)}) but current`;
      out.push({ client_code: c, action: "Credit-limit review", triggers: [t], triggerText: t, recommendedAction: "Credit-limit review; do not chase", approver: ESCALATION.creditLimitApprover });
    }
  }
  return out;
}
