// KPI table, 4-week expected inflow and AR-by-rep table.
import type { InflowWeek, Kpis, RepRow } from "./types";
import { KPI, INFLOW } from "./rules";
import { type Model, sum, seqSum, sortedGroups } from "./model";
import { type Base, bucketRecord, estimatedBadDebt } from "./aging";
import { isoOf } from "./dates";

export interface KpisPlus extends Kpis {
  /** Bad debt written off as a share of net credit sales, per year in the annual file. */
  writeOffPctByYear: { year: number; pct: number }[];
  monthSales: number;
  monthCollections: number;
}

export function computeKpis(m: Model, b: Base): KpisPlus {
  const { cut, pme } = m;
  const s90 = sum(m.sales.filter((s) => s.invoice_date > cut - KPI.dsoWindowDays).map((s) => s.net));
  const dso = (b.glAr / s90) * KPI.dsoWindowDays;
  const over = (days: number) => sum(m.ar.filter((a) => a.days_overdue > days).map((a) => a.balance));
  const monthSales = sum(m.sales.filter((s) => s.invoice_date > pme && s.invoice_date <= cut).map((s) => s.net));
  const monthCollections = sum(m.pay.filter((p) => p.payment_date > pme && p.payment_date <= cut).map((p) => p.amount));
  const currentClosing = sum(m.ar.filter((a) => a.days_overdue === 0).map((a) => a.balance));
  const collEff = monthCollections / (b.glOpen + monthSales - currentClosing);
  const depMonth = sum(m.pdc.filter((p) => p.date_deposited !== null && p.date_deposited > pme && p.date_deposited <= cut).map((p) => p.amount));
  const returned = sum(m.bnc.filter((x) => x.date_returned !== null && x.date_returned > pme).map((x) => x.amount));
  const bouncedRate = returned / Math.max(depMonth, 1);
  const inv90 = new Set(m.ar.filter((a) => a.days_overdue > KPI.over90Days).map((a) => a.inv_no));
  const unrepNot90 = seqSum(
    b.bouncedOpen
      .filter((x) => !String(x.invoices_covered ?? "nan").split(",").every((i) => inv90.has(i)))
      .map((x) => x.amount),
  );
  const top = (rows: [string, number][], denom: number) => sum(rows.slice(0, KPI.top10Count).map((r) => r[1])) / denom;
  const lossRates = bucketRecord(b.lossRates);
  return {
    dso,
    pctOver60: over(KPI.over60Days) / b.arTotal,
    pctOver90: over(KPI.over90Days) / b.arTotal,
    collectionEfficiency: collEff,
    totalAr: b.arTotal,
    ledgerAr: b.glAr,
    overdueExclDisputes: b.totOverdue,
    bouncedRate,
    atRisk: over(KPI.over90Days) + unrepNot90,
    top10ShareAr: top(b.byClientAr, b.arTotal),
    top10ShareOverdue: top(b.byClientOd, b.totOverdue),
    estimatedBadDebt: estimatedBadDebt(b),
    allowance: b.allowance,
    lossRates,
    buckets: bucketRecord(b.bucketBal),
    writeOffPctByYear: m.annual.map((a) => ({ year: a.year, pct: a.bad_debt_written_off / a.net_credit_sales })),
    monthSales,
    monthCollections,
  };
}

export function computeInflow(m: Model, b: Base): InflowWeek[] {
  const { cut } = m;
  const curDue = m.ar.filter((a) => a.days_overdue === 0 && !b.pdcClients.has(a.client_code));
  const weeks: InflowWeek[] = [];
  for (let i = 0; i < INFLOW.weeks; i++) {
    const a = cut + 7 * i + 1;
    const e = cut + 7 * (i + 1);
    const pdcs = sum(b.onhand.filter((p) => p.check_date !== null && p.check_date <= e && (p.check_date >= a || i === 0)).map((p) => p.amount));
    const promises = sum(
      b.openProm.filter((p) => (p.promise_date as number) >= a && (p.promise_date as number) <= e).map((p) => p.promise_amount ?? 0),
    );
    const currentInvoices = sum(curDue.filter((x) => x.due_date >= a && x.due_date <= e).map((x) => x.balance));
    weeks.push({
      label: `Week ${i + 1} (${isoOf(a)} to ${isoOf(e)})`,
      start: isoOf(a),
      end: isoOf(e),
      pdcs,
      promises,
      currentInvoices,
      total: pdcs + promises + currentInvoices,
    });
  }
  return weeks;
}

export function computeReps(m: Model): RepRow[] {
  const { cut, pme } = m;
  const sM = m.sales.filter((s) => s.invoice_date > pme);
  const s90 = m.sales.filter((s) => s.invoice_date > cut - KPI.dsoWindowDays);
  const od60 = new Set(m.ar.filter((a) => a.days_overdue > KPI.over60Days).map((a) => a.client_code));
  return sortedGroups(m.ar, (a) => a.rep).map(([rep, g]) => {
    const total = sum(g.map((x) => x.balance));
    const sm = sM.filter((s) => s.rep === rep);
    return {
      rep,
      totalAr: total,
      overdue: sum(g.filter((x) => x.days_overdue > 0).map((x) => x.balance)),
      pctOver60: sum(g.filter((x) => x.days_overdue > KPI.over60Days).map((x) => x.balance)) / total,
      dso: (total / sum(s90.filter((s) => s.rep === rep).map((s) => s.net))) * KPI.dsoWindowDays,
      discountRate: sum(sm.map((s) => s.discount)) / Math.max(sum(sm.map((s) => s.gross)), 1),
      creditMemoRate: sum(m.cm.filter((c) => c.rep === rep).map((c) => c.amount)) / sum(m.sales.filter((s) => s.rep === rep).map((s) => s.net)),
      salesTo60Plus: sum(sm.filter((s) => od60.has(s.client_code)).map((s) => s.net)),
    };
  });
}
