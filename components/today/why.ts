// Turns the engine's priority breakdown (row.factors) into short words for the Today list.
// No maths here: points and labels come straight from lib/engine; we only pick, order and shorten words.
import type { FollowUpRow } from "@/lib/engine/types";

/** "1 days overdue" -> "1 day overdue". */
export function dayWord(label: string): string {
  return label.replace(/\b1 days\b/g, "1 day");
}

const SHORT: [RegExp, string][] = [
  [/^Broke a promise in the last 30 days$/i, "broke a promise"],
  [/^Bounced check in last 12 months$/i, "bounced check"],
  [/^Overdue amount in top 20%$/i, "amount in top 20%"],
  [/^Overdue amount in next 30%$/i, "amount in next 30%"],
  [/^No contact in 14\+ days$/i, "no contact in 14+ days"],
  [/^Over credit limit$/i, "over credit limit"],
  [/^Payment slowdown$/i, "paying slower"],
  [/^PDCs on hand cover the overdue amount$/i, "checks on hand cover it"],
];

/** Short lower-case label for one factor, for the one-line "why". */
export function shortFactor(label: string): string {
  const hit = SHORT.find(([re]) => re.test(label));
  return dayWord(hit ? hit[1] : label);
}

/** The top N point reasons (largest points first; ties keep engine order). */
export function topFactors(row: FollowUpRow, n = 2) {
  return row.factors
    .map((f, i) => ({ ...f, i }))
    .filter((f) => f.points > 0)
    .sort((a, z) => z.points - a.points || a.i - z.i)
    .slice(0, n)
    .map(({ label, points }) => ({ label: shortFactor(label), points }));
}
