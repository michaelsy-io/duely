// UI-side helpers that arrange engine output for screens. No new maths: only filtering/sorting/summing engine rows.
import type { EngineResult, FollowUpRow } from "@/lib/engine/types";
import type { Tone } from "@/components/ui/Chip";

export type NextStep = "Escalate" | "Call now" | "Deposit check" | "Send reminder";

export function nextStep(row: FollowUpRow, result: EngineResult): NextStep {
  const esc = result.escalations.find((e) => e.client_code === row.client_code);
  if (esc && /hold/i.test(esc.action)) return "Escalate";
  if (row.score >= 40) return "Call now";
  if (row.pdcCover >= row.overdue) return "Deposit check";
  return "Send reminder";
}

export const STEP_TONE: Record<NextStep, Tone> = {
  Escalate: "bad",
  "Call now": "accent",
  "Deposit check": "good",
  "Send reminder": "primary",
};

export const STEP_SLUG: Record<NextStep, string> = {
  Escalate: "escalate",
  "Call now": "call",
  "Deposit check": "deposit",
  "Send reminder": "remind",
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
