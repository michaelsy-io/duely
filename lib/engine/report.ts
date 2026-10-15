// Renders an engine result as the same markdown report the answer-key reference prints.
import type { FullEngineResult } from "./index";
import { peso, pct, fixed } from "./format";
import { BUCKETS } from "./rules";

const PLANTED = new Set(["C014", "C007", "C011", "C023", "C003", "C005", "C036", "C040", "C019", "C012", "C044"]);

export function renderReport(r: FullEngineResult): string {
  const out: string[] = [];
  const P = (s: string) => out.push(s);
  const k = r.kpis;
  const c = r.control;
  P(`# Expected results: period ending ${r.asOf}\n`);
  P("## Control checks");
  P(`- AR aging total ${peso(c.agingTotal)} vs ledger AR ${peso(c.ledgerAr)}; gap ${peso(c.gap)}` +
    (c.unappliedRefs.length ? ` = unapplied payment(s) ${peso(c.unappliedTotal)}` : " (ties)"));
  P(`- Client codes missing from customer master: ${c.missingClients.length}`);
  P("\n## KPI table (top management)");
  P("| KPI | Value |\n| --- | --- |");
  const rows: [string, string][] = [
    ["DSO (AR ÷ last-90-day sales × 90)", `${fixed(k.dso, 1)} days`],
    ["% of AR over 60 days", pct(k.pctOver60)], ["% of AR over 90 days", pct(k.pctOver90)],
    ["Collection efficiency (month)", pct(k.collectionEfficiency)],
    ["Total AR (aging) / ledger AR", `${peso(k.totalAr)} / ${peso(k.ledgerAr)}`],
    ["Overdue AR excl. open disputes", peso(k.overdueExclDisputes)],
    ["Bounced PDC rate (month, by value)", pct(k.bouncedRate)],
    ["At-risk exposure (90+ plus unreplaced bounced checks not already 90+)", peso(k.atRisk)],
    ["Top-10 share of total AR", pct(k.top10ShareAr)], ["Top-10 share of overdue AR", pct(k.top10ShareOverdue)],
    ["Estimated bad debt (aging x historical loss rate)", peso(k.estimatedBadDebt)],
    ["Allowance for doubtful accounts (ledger)", peso(k.allowance)],
    ["Bad debt written off % of sales 2023 / 2024 / 2025", k.writeOffPctByYear.map((y) => pct(y.pct, 2)).join(" / ")],
  ];
  for (const [a, b] of rows) P(`| ${a} | ${b} |`);
  P("\nLoss rates used: " + BUCKETS.map((b) => `${b} ${pct(k.lossRates[b], 2)}`).join(", "));
  P("\nAging buckets: " + BUCKETS.map((b) => `${b} ${peso(k.buckets[b])}`).join(", "));
  P("\n## Expected inflow, next 4 weeks");
  P("| Week | PDCs maturing | Promises due | Current invoices falling due (non-PDC clients) | Total |\n| --- | --- | --- | --- | --- |");
  for (const w of r.inflow) P(`| ${w.label} | ${peso(w.pdcs)} | ${peso(w.promises)} | ${peso(w.currentInvoices)} | ${peso(w.total)} |`);
  P("\n## AR by rep");
  P("| Rep | Total AR | Overdue | % over 60 | DSO | Discount rate (month) | Credit memo rate (12 mo) | Sales this month to clients 60+ overdue |\n| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const x of r.reps) {
    P(`| ${x.rep} | ${peso(x.totalAr)} | ${peso(x.overdue)} | ${pct(x.pctOver60)} | ${fixed(x.dso, 0)} | ${pct(x.discountRate)} | ${pct(x.creditMemoRate, 2)} | ${peso(x.salesTo60Plus)} |`);
  }
  P("\n## Exceptions and bad-debt flags");
  P("| Flag | Client / rep | Amount | Rule triggered | Source row | Owner |\n| --- | --- | --- | --- | --- | --- |");
  for (const f of r.flags) P(`| ${f.flag} | ${f.who} | ${peso(f.amount)} | ${f.rule} | ${f.source} | ${f.owner} |`);
  P(`\n## Collections: prioritized follow-up list (${r.followUp.length} accounts with overdue balances; full list)`);
  P("| Rank | Client | Segment | Collector | Overdue | Oldest days | Score | Reason | Open promise |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const x of r.followUp) {
    P(`| ${x.rank} | ${x.client_code} | ${x.segment} | ${x.collector} | ${peso(x.overdue)} | ${x.oldestDays} | ${x.score} | ${x.reasonText} | ${x.openPromise ? `open promise ${x.openPromise.date}` : ""} |`);
  }
  P("\nPlanted accounts' positions: " + r.followUp.filter((x) => PLANTED.has(x.client_code)).map((x) => `${x.client_code} #${x.rank}`).join(", "));
  for (const n of r.netted) P(`\nUnapplied cash netted against ${n.client_code}'s overdue balance: ${peso(n.amount)}` + (n.dropsOff ? " — account drops off the list" : ""));
  P("\nOn hold (open disputes / pending returns, not chased): " +
    (r.onHold.map((h) => `${h.client_code} ${h.inv_no} ${peso(h.amount)} (${h.reason})`).join(", ") || "none"));
  P("\n## PDC calendar (checks on hand)");
  P("| Check date | Client | Amount | Flag |\n| --- | --- | --- | --- |");
  for (const p of r.pdcs) P(`| ${p.check_date} | ${p.client_code} | ${peso(p.amount)} | ${p.flags.join("; ")} |`);
  P(`\n(Showing checks dated up to ${r.pdcSummary.horizon} plus any flagged; ${r.pdcSummary.count} checks on hand in total, ${peso(r.pdcSummary.total)}.)`);
  P("\nBounced and awaiting replacement: " +
    (r.bouncedOpen.map((b) => `${b.client_code} ${peso(b.amount)} returned ${b.date_returned} (${b.daysAgo} days ago)`).join(", ") || "none"));
  P("\n## Escalation list");
  P("| Client | Trigger met | Recommended action | Approver |\n| --- | --- | --- | --- |");
  for (const e of r.escalations) P(`| ${e.client_code} | ${e.triggerText} | ${e.recommendedAction} | ${e.approver} |`);
  return out.join("\n");
}
