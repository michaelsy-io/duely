// Shared base figures: control check, open items, aging buckets and loss rates.
import type { Bucket, ControlCheck } from "./types";
import { BUCKETS, INFLOW } from "./rules";
import { type Model, type ArT, type BounceT, type PdcT, type ActT, type PaymentT, sum, ksum, sortedGroups, sortByDate } from "./model";

export interface Base {
  arTotal: number;
  glAr: number;
  glOpen: number;
  allowance: number;
  unapplied: PaymentT[];
  openDisp: Model["dsp"];
  disputedInv: Set<string>;
  overdue: ArT[]; // days_overdue > 0 and not in an open dispute
  totOverdue: number;
  bouncedOpen: BounceT[];
  onhand: PdcT[];
  pdcClients: Set<string>;
  openProm: ActT[]; // latest promise per client, still in the future
  byClientAr: [string, number][]; // desc
  byClientOd: [string, number][]; // desc
  balTotal: Map<string, number>; // sorted by client
  bucketBal: Map<string, number>;
  lossRates: Map<string, number>; // keys in pandas groupby (sorted) order
}

/** Stable sort descending by value (pandas sort_values(ascending=False) on a sorted-key groupby). */
function descByValue(groups: [string, number][]): [string, number][] {
  return groups.map((g, i) => [g, i] as const).sort((a, b) => b[0][1] - a[0][1] || a[1] - b[1]).map((x) => x[0]);
}

export function computeBase(m: Model): Base {
  const isAr = (a: string) => a.startsWith("Accounts receivable");
  const glAr = m.gl.find((g) => isAr(g.account) && g.as_of === m.cut)?.balance ?? NaN;
  const glOpen = m.gl.find((g) => isAr(g.account) && g.as_of !== null && g.as_of < m.cut)?.balance ?? NaN;
  const allowanceRow = m.gl.find((g) => g.account.startsWith("Allowance"));
  const allowance = allowanceRow ? -allowanceRow.balance : 0;
  const unapplied = m.pay.filter((p) => p.applied_status === "Unapplied");
  const openDisp = m.dsp.filter((x) => x.status === "Open");
  const disputedInv = new Set(openDisp.map((x) => x.inv_no).filter((x): x is string => !!x));
  const overdue = m.ar.filter((a) => a.days_overdue > 0 && !disputedInv.has(a.inv_no));
  const bouncedOpen = m.bnc.filter((b) => b.replaced === "N");
  const onhand = m.pdc.filter((p) => p.status === "On hand");
  const pdcClients = new Set([...m.cust.values()].filter((c) => c.method === INFLOW.pdcPaymentMethod).map((c) => c.client_code));

  // latest promise per client (by activity date, file order on ties), kept if promise date is after the cut
  const withProm = sortByDate(m.act.filter((a) => a.promise_date !== null), (a) => a.activity_date);
  const latest = new Map<string, ActT>();
  for (const a of withProm) latest.set(a.client_code, a);
  // groupby().tail(1) keeps the original (sorted) row order
  const latestRows = withProm.filter((a) => latest.get(a.client_code) === a);
  const openProm = latestRows.filter((a) => (a.promise_date as number) > m.cut);

  const balGroups = sortedGroups(m.ar, (a) => a.client_code).map(([c, g]) => [c, ksum(g.map((x) => x.balance))] as [string, number]);
  const odGroups = sortedGroups(overdue, (a) => a.client_code).map(([c, g]) => [c, ksum(g.map((x) => x.balance))] as [string, number]);
  const bucketBal = new Map(sortedGroups(m.ar, (a) => a.bucket).map(([b, g]) => [b, ksum(g.map((x) => x.balance))]));
  const lossRates = new Map(
    sortedGroups(m.loss, (l) => l.bucket).map(([b, g]) => [b, sum(g.map((x) => x.later_written_off)) / sum(g.map((x) => x.balance_at_year_end))]),
  );

  return {
    arTotal: sum(m.ar.map((a) => a.balance)),
    glAr,
    glOpen,
    allowance,
    unapplied,
    openDisp,
    disputedInv,
    overdue,
    totOverdue: sum(overdue.map((a) => a.balance)),
    bouncedOpen,
    onhand,
    pdcClients,
    openProm,
    byClientAr: descByValue(balGroups),
    byClientOd: descByValue(odGroups),
    balTotal: new Map(balGroups),
    bucketBal,
    lossRates,
  };
}

export function controlCheck(m: Model, b: Base): ControlCheck {
  return {
    agingTotal: b.arTotal,
    ledgerAr: b.glAr,
    gap: b.arTotal - b.glAr,
    unappliedTotal: sum(b.unapplied.map((p) => p.amount)),
    unappliedRefs: b.unapplied.map((p) => p.payment_id),
    missingClients: [...new Set(m.ar.map((a) => a.client_code))].filter((c) => !m.cust.has(c)).sort(),
  };
}

export function bucketRecord(map: Map<string, number>): Record<Bucket, number> {
  const o = {} as Record<Bucket, number>;
  for (const k of BUCKETS) o[k] = map.get(k) ?? 0;
  return o;
}

export function estimatedBadDebt(b: Base): number {
  let est = 0;
  for (const [k, r] of b.lossRates) est += (b.bucketBal.get(k) ?? 0) * r;
  return est;
}
