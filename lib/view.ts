// UI-side helpers that arrange engine output for screens. No new maths: only filtering/sorting/summing engine rows.
import type { EngineResult, FollowUpRow } from "@/lib/engine/types";
import type { Tone } from "@/components/ui/Chip";
import { ESCALATION } from "@/lib/engine/rules";

/** The escalation ladder from business_rules.md section 3, one rung per overdue client. */
export type NextStep = "Credit hold" | "Visit" | "Call for a date" | "Remind and call";

/**
 * Highest ladder rung the client has reached. Credit hold and Visit come straight from the engine's
 * escalations; the two lower rungs follow the oldest days overdue (31-60: call, 1-30: remind and call).
 */
export function nextStep(row: FollowUpRow, result: EngineResult): NextStep {
  const esc = result.escalations.find((e) => e.client_code === row.client_code);
  if (esc?.action === "Credit hold") return "Credit hold";
  if (esc?.action === "Visit") return "Visit";
  if (row.oldestDays > ESCALATION.callDays) return "Call for a date";
  return "Remind and call";
}

/** What each rung means, in the rules' own words (for tooltips). */
export const STEP_RULE: Record<NextStep, string> = {
  "Credit hold": "90+ days overdue, two broken promises in 90 days, or a bounced check unreplaced after 7 days: credit-hold recommendation, approved by top management.",
  Visit: "61-90 days overdue, or one broken promise: visit the client and inform the sales rep (collections supervisor).",
  "Call for a date": "31-60 days overdue: call and ask for a payment date or a post-dated check.",
  "Remind and call": "1-30 days overdue: send a reminder message and call.",
};

export const STEP_TONE: Record<NextStep, Tone> = {
  "Credit hold": "bad",
  Visit: "orange",
  "Call for a date": "accent",
  "Remind and call": "primary",
};

export function scoreTone(score: number): Tone {
  if (score >= 60) return "bad";
  if (score >= 40) return "orange";
  if (score >= 20) return "warn";
  return "neutral";
}

export function rowsFor(result: EngineResult, collector: string | null): FollowUpRow[] {
  return collector ? result.followUp.filter((r) => r.collector === collector) : result.followUp;
}

export const has = (r: FollowUpRow, re: RegExp) => r.reasons.some((x) => re.test(x));

export function sum<T>(xs: T[], f: (x: T) => number) {
  return xs.reduce((a, x) => a + (f(x) || 0), 0);
}
