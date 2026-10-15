// Exceptions and bad-debt flags, in the reference's order.
import type { FlagRow, InflowWeek } from "./types";
import { FLAGS, INFLOW } from "./rules";
import { type Model, sum, ksum, mean, sortedGroups, sortByDate } from "./model";
import type { Base } from "./aging";
import { peso, pct } from "./format";

const pctOrNan = (x: number, d: number) => (Number.isNaN(x) ? "nan%" : pct(x, d));

export interface FlagRowPlus extends FlagRow {
  /** Machine key for the flag type. */
  kind: string;
  client_code: string | null;
}

export function computeFlags(
  m: Model,
  b: Base,
  inflow: InflowWeek[],
  estBad: number,
  prev?: Model,
): FlagRowPlus[] {
  const { cut, pme } = m;
  const flags: FlagRowPlus[] = [];
  const F = (kind: string, flag: string, who: string, client: string | null, amount: number, rule: string, source: string, owner: string) =>
    flags.push({ kind, flag, who, client_code: client, amount, rule, source, owner });

  // Discount above norm
  const six = m.sales.filter((s) => s.invoice_date > cut - FLAGS.discountHistoryDays).map((s) => ({ ...s, rate: s.discount / s.gross }));
  for (const r of six.filter((s) => s.invoice_date > pme)) {
    const hist = mean(six.filter((x) => x.client_code === r.client_code && x.inv_no !== r.inv_no).map((x) => x.rate));
    if (r.rate > FLAGS.discountPolicyMax || (r.rate > 0 && r.rate > FLAGS.discountMultipleOfAverage * hist)) {
      F("discount", "Discount above norm", `${r.client_code} / ${r.rep}`, r.client_code, r.discount,
        `${pctOrNan(r.rate, 0)} discount vs client's 6-month average ${pctOrNan(hist, 1)}; policy max 10%`, r.inv_no, "Sales manager");
    }
  }
  // Unapproved credit memo
  for (const r of m.cm.filter((c) => c.memo_date > pme)) {
    if (r.approver_role === null || r.amount > (FLAGS.creditMemoLimits[r.approver_role] ?? 0)) {
      F("credit_memo", "Unapproved credit memo", `${r.client_code} / ${r.rep}`, r.client_code, r.amount,
        r.approver_role === null ? "No approver recorded" : `Above ${r.approver_role} limit`, r.memo_no, "Finance head");
    }
  }
  // Repeated returns
  const ret = sortByDate(m.cm.filter((c) => c.reason.startsWith(FLAGS.returnReasonPrefix)), (c) => c.memo_date);
  for (const [c, g] of sortedGroups(ret, (x) => x.client_code)) {
    const recent = g.some((x, i) => i > 0 && x.memo_date > pme && x.memo_date - g[i - 1].memo_date <= FLAGS.repeatedReturnsDays);
    if (recent) {
      F("repeated_returns", "Repeated returns", c, c, sum(g.map((x) => x.amount)), "2+ returns within 30 days", g.map((x) => x.memo_no).join(","), "Sales manager");
    }
  }
  // Possible duplicate invoice
  const sm2 = sortByDate(m.sales.filter((s) => s.invoice_date > cut - FLAGS.duplicateWindowDays), (s) => s.invoice_date);
  const dupGroups = [...new Map(sm2.map((s) => [`${s.client_code}|${s.net}`, [s.client_code, s.net] as const])).values()]
    .sort((a, z) => (a[0] < z[0] ? -1 : a[0] > z[0] ? 1 : a[1] - z[1]));
  for (const [c, amt] of dupGroups) {
    const g = sm2.filter((s) => s.client_code === c && s.net === amt);
    if (g.length > 1 && g.some((x, i) => i > 0 && x.invoice_date - g[i - 1].invoice_date <= FLAGS.duplicateMaxGapDays)) {
      F("duplicate", "Possible duplicate invoice", c, c, amt, "Same client, same amount within 3 days", g.map((x) => x.inv_no).join(" & "), "Finance head");
    }
  }
  // Unapplied payment
  for (const r of b.unapplied) {
    const days = cut - r.payment_date;
    if (days >= FLAGS.unappliedMinDays) {
      F("unapplied", "Unapplied payment", r.client_code, r.client_code, r.amount, `Not matched to an invoice for ${days} days`, r.payment_id, "Accounting");
    }
  }
  // Order to an at-risk client
  const risk = new Set(m.ar.filter((a) => a.days_overdue > FLAGS.atRiskDays).map((a) => a.client_code));
  for (const r of m.sales.filter((s) => s.invoice_date > pme && risk.has(s.client_code))) {
    F("at_risk_order", "Order to an at-risk client", `${r.client_code} / ${r.rep}`, r.client_code, r.net,
      "New invoice while client has 90+ day balance", r.inv_no, "Sales manager, credit review");
  }
  // Sudden balance jump (needs the previous period)
  if (prev) {
    const pa = new Map(sortedGroups(prev.ar, (a) => a.client_code).map(([c, g]) => [c, ksum(g.map((x) => x.balance))]));
    for (const [c, v] of b.byClientAr) {
      const pv = pa.get(c) ?? 0;
      if (pv > 0 && v >= FLAGS.balanceJumpMultiple * pv && v - pv >= FLAGS.balanceJumpMinShareOfAr * b.arTotal) {
        F("balance_jump", "Sudden balance jump", c, c, v - pv, `AR ${peso(pv)} → ${peso(v)} (+${pct(v / pv - 1, 0)}); increase ≥ 1% of total AR`, "ar_aging.csv", "Credit review");
      }
    }
  }
  // Inflow drop
  const avg4 = mean(inflow.map((w) => w.total));
  for (const w of inflow) {
    if (w.total < INFLOW.dropShareOfAverage * avg4) {
      F("inflow_drop", "Inflow drop", w.label.split(" (")[0], null, w.total, `${pct(w.total / avg4, 0)} of 4-week average`, "expected inflow table", "Top management");
    }
  }
  // Concentration
  for (const [c, v] of b.byClientOd) {
    if (v / b.totOverdue > FLAGS.concentrationShare) {
      F("concentration", "Concentration", c, c, v, `${pct(v / b.totOverdue, 0)} of total overdue`, "ar_aging.csv", "Top management");
    }
  }
  // Bad debt: write-off candidates and doubtful accounts
  const D = FLAGS.doubtful;
  const lastPay = new Map<string, number>();
  for (const p of m.pay) lastPay.set(p.client_code, Math.max(lastPay.get(p.client_code) ?? -Infinity, p.payment_date));
  for (const [c, g] of sortedGroups(m.ar, (a) => a.client_code)) {
    const mx = Math.max(...g.map((x) => x.days_overdue));
    const lp = lastPay.get(c);
    const since = lp === undefined ? null : cut - lp;
    const noPay60 = since === null || since > D.noPaymentDays;
    const unrep = b.bouncedOpen.filter((x) => x.client_code === c);
    const actAll = m.act.filter((x) => x.client_code === c);
    const a = actAll.filter((x) => x.activity_date > cut - D.noResponseWindowDays);
    const noresp = a.filter((x) => x.outcome !== null && D.noResponsePattern.test(x.outcome)).length;
    const reasons: string[] = [];
    if (mx > D.over120Days) reasons.push(`${mx} days overdue`);
    if (mx > D.over90Days && noPay60) reasons.push(since ? `90+ and no payment in ${since} days` : "90+ and no payment in 12 months");
    if (unrep.length >= D.unreplacedBounced) reasons.push("2+ unreplaced bounced checks");
    if (noresp >= D.noResponseAttempts) reasons.push(`${noresp} unanswered contact attempts in 60 days`);
    const demandEver = actAll.some((x) => x.action === D.demandLetterAction);
    const demandRecent = a.some((x) => x.action === D.demandLetterAction);
    if (mx > D.writeOffDays || demandRecent || (demandEver && mx > D.demandLetterDays)) {
      F("write_off", "Write-off candidate", c, c, sum(g.filter((x) => x.days_overdue > D.over90Days).map((x) => x.balance)),
        demandEver ? `${mx} days overdue; demand letter already sent` : `${mx} days overdue`, "ar_aging.csv", "Top management with accountant");
    } else if (reasons.length) {
      F("doubtful", "Doubtful account", c, c, sum(g.map((x) => x.balance)), reasons.join("; "), "ar_aging.csv", "Finance head");
    }
  }
  if (estBad > b.allowance) {
    F("allowance_shortfall", "Allowance shortfall", "Portfolio", null, estBad - b.allowance,
      `Estimate ${peso(estBad)} vs allowance ${peso(b.allowance)}`, "gl_extract.csv", "Top management");
  }
  return flags;
}
