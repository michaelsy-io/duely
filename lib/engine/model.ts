// Typed view of a Snapshot. Dates become day numbers (see dates.ts); blanks become null.
import type { Snapshot } from "./types";
import { dayNum, prevMonthEnd } from "./dates";

type Raw = Record<string, string | number | null>;
const s = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));
const n = (v: unknown): number => (v === null || v === undefined || v === "" ? NaN : Number(v));
const d = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : dayNum(String(v)));

export interface CustomerT { client_code: string; segment: string; area: string; rep: string; collector: string; terms: number; credit_limit: number; method: string; }
export interface SaleT { inv_no: string; invoice_date: number; due_date: number; client_code: string; rep: string; gross: number; discount: number; net: number; }
export interface PaymentT { payment_id: string; payment_date: number; client_code: string; applied_to_invoice: string | null; amount: number; applied_status: string; }
export interface ArT { client_code: string; inv_no: string; invoice_date: number; due_date: number; balance: number; days_overdue: number; bucket: string; rep: string; }
export interface PdcT { check_no: string; client_code: string; invoices_covered: string | null; amount: number; check_date: number | null; status: string; date_deposited: number | null; }
export interface BounceT { check_no: string; client_code: string; invoices_covered: string | null; amount: number; date_returned: number | null; replaced: string; }
export interface ActT { activity_date: number; client_code: string; action: string; outcome: string | null; promise_date: number | null; promise_amount: number | null; }
export interface MemoT { memo_no: string; memo_date: number; client_code: string; rep: string; amount: number; reason: string; approver_role: string | null; }
export interface DisputeT { client_code: string; inv_no: string | null; amount: number; reason: string; status: string; }
export interface GlT { account: string; as_of: number | null; balance: number; }
export interface LossT { bucket: string; balance_at_year_end: number; later_written_off: number; }
export interface AnnualT { year: number; net_credit_sales: number; bad_debt_written_off: number; }

export interface Model {
  asOf: string;
  cut: number;
  pme: number; // previous month end
  cust: Map<string, CustomerT>;
  sales: SaleT[];
  pay: PaymentT[];
  ar: ArT[];
  pdc: PdcT[];
  bnc: BounceT[];
  act: ActT[];
  cm: MemoT[];
  dsp: DisputeT[];
  gl: GlT[];
  loss: LossT[];
  annual: AnnualT[];
}

function t(snap: Snapshot, name: string): Raw[] {
  return snap.tables[name] ?? snap.tables[name + ".csv"] ?? [];
}

export function buildModel(snap: Snapshot): Model {
  const cust = new Map<string, CustomerT>();
  for (const r of t(snap, "customers")) {
    const code = s(r.client_code)!;
    cust.set(code, {
      client_code: code, segment: s(r.segment) ?? "", area: s(r.area) ?? "", rep: s(r.rep) ?? "",
      collector: s(r.collector) ?? "", terms: n(r.payment_terms_days), credit_limit: n(r.credit_limit),
      method: s(r.usual_payment_method) ?? "",
    });
  }
  return {
    asOf: snap.asOf,
    cut: dayNum(snap.asOf),
    pme: prevMonthEnd(snap.asOf),
    cust,
    sales: t(snap, "sales_invoices").map((r) => ({
      inv_no: s(r.inv_no)!, invoice_date: d(r.invoice_date)!, due_date: d(r.due_date)!, client_code: s(r.client_code)!,
      rep: s(r.rep) ?? "", gross: n(r.gross_amount), discount: n(r.discount_amount), net: n(r.net_amount),
    })),
    pay: t(snap, "payments").map((r) => ({
      payment_id: s(r.payment_id)!, payment_date: d(r.payment_date)!, client_code: s(r.client_code)!,
      applied_to_invoice: s(r.applied_to_invoice), amount: n(r.amount), applied_status: s(r.applied_status) ?? "",
    })),
    ar: t(snap, "ar_aging").map((r) => ({
      client_code: s(r.client_code)!, inv_no: s(r.inv_no)!, invoice_date: d(r.invoice_date)!, due_date: d(r.due_date)!,
      balance: n(r.balance), days_overdue: n(r.days_overdue), bucket: s(r.bucket) ?? "", rep: s(r.rep) ?? "",
    })),
    pdc: t(snap, "pdc_register").map((r) => ({
      check_no: s(r.check_no_masked) ?? "", client_code: s(r.client_code)!, invoices_covered: s(r.invoices_covered),
      amount: n(r.amount), check_date: d(r.check_date), status: s(r.status) ?? "", date_deposited: d(r.date_deposited),
    })),
    bnc: t(snap, "bounced_checks").map((r) => ({
      check_no: s(r.check_no_masked) ?? "", client_code: s(r.client_code)!, invoices_covered: s(r.invoices_covered),
      amount: n(r.amount), date_returned: d(r.date_returned), replaced: s(r.replaced) ?? "",
    })),
    act: t(snap, "collection_activity").map((r) => ({
      activity_date: d(r.activity_date)!, client_code: s(r.client_code)!, action: s(r.action) ?? "",
      outcome: s(r.outcome), promise_date: d(r.promise_date),
      promise_amount: s(r.promise_amount) === null ? null : n(r.promise_amount),
    })),
    cm: t(snap, "credit_memos").map((r) => ({
      memo_no: s(r.memo_no)!, memo_date: d(r.memo_date)!, client_code: s(r.client_code)!, rep: s(r.rep) ?? "",
      amount: n(r.amount), reason: s(r.reason) ?? "", approver_role: s(r.approver_role),
    })),
    dsp: t(snap, "disputes").map((r) => ({
      client_code: s(r.client_code)!, inv_no: s(r.inv_no), amount: n(r.amount), reason: s(r.reason) ?? "", status: s(r.status) ?? "",
    })),
    gl: t(snap, "gl_extract").map((r) => ({ account: s(r.account) ?? "", as_of: d(r.as_of), balance: n(r.balance) })),
    loss: t(snap, "aging_loss_history").map((r) => ({
      bucket: s(r.bucket) ?? "", balance_at_year_end: n(r.balance_at_year_end), later_written_off: n(r.later_written_off),
    })),
    annual: t(snap, "annual_sales_and_writeoffs").map((r) => ({
      year: n(r.year), net_credit_sales: n(r.net_credit_sales), bad_debt_written_off: n(r.bad_debt_written_off),
    })),
  };
}

// ---- small helpers shared by the modules
// Summation matches pandas bit for bit: Series.sum() is numpy's pairwise sum,
// groupby().sum() is Kahan-compensated, Python's builtin sum() is sequential.
// NaNs are skipped (pandas skipna).
function pairwise(a: number[], lo: number, n: number): number {
  if (n < 8) {
    let r = 0;
    for (let i = lo; i < lo + n; i++) r += a[i];
    return r;
  }
  if (n <= 128) {
    const r = a.slice(lo, lo + 8);
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[lo + i + j];
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
    for (; i < n; i++) res += a[lo + i];
    return res;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwise(a, lo, n2) + pairwise(a, lo + n2, n - n2);
}
/** pandas Series.sum() */
export const sum = (xs: number[]): number => {
  const v = xs.map((x) => (Number.isNaN(x) ? 0 : x));
  return pairwise(v, 0, v.length);
};
/** pandas groupby(...).sum() (Kahan summation) */
export const ksum = (xs: number[]): number => {
  let s = 0, c = 0;
  for (const x of xs) {
    if (Number.isNaN(x)) continue;
    const y = x - c;
    const t = s + y;
    c = t - s - y;
    s = t;
  }
  return s;
};
/** Python builtin sum() */
export const seqSum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]): number => {
  const v = xs.filter((x) => !Number.isNaN(x));
  return v.length ? sum(v) / v.length : NaN;
};
export function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const g = m.get(k);
    if (g) g.push(x); else m.set(k, [x]);
  }
  return m;
}
/** Groups in sorted key order (pandas groupby default). */
export function sortedGroups<T>(xs: T[], key: (x: T) => string): [string, T[]][] {
  return [...groupBy(xs, key).entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
/** pandas Series.quantile(q) with linear interpolation (numpy _lerp). */
export function quantile(values: number[], q: number): number {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const h = (v.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, v.length - 1);
  const t = h - lo;
  const a = v[lo], b = v[hi];
  const diff = b - a;
  return t >= 0.5 ? b - diff * (1 - t) : a + diff * t;
}

/**
 * numpy's generic introsort argsort (`kind="quicksort"`), which pandas uses for
 * `sort_values` on date columns. It is not stable, so ties come out in the same
 * (implementation-defined) order as the reference. Null keys go last, in order.
 */
export function argsortQuick(keys: (number | null)[]): number[] {
  const idx: number[] = [];
  const nulls: number[] = [];
  keys.forEach((k, i) => (k === null || Number.isNaN(k) ? nulls : idx).push(i));
  const v = idx.map((i) => keys[i] as number);
  const t = v.map((_, i) => i);
  const num = t.length;
  if (num >= 2) {
    let pl = 0, pr = num - 1;
    const stack: [number, number][] = [];
    const sw = (a: number, b: number) => { const x = t[a]; t[a] = t[b]; t[b] = x; };
    for (;;) {
      while (pr - pl > 15) {
        const pm = pl + ((pr - pl) >> 1);
        if (v[t[pm]] < v[t[pl]]) sw(pm, pl);
        if (v[t[pr]] < v[t[pm]]) sw(pr, pm);
        if (v[t[pm]] < v[t[pl]]) sw(pm, pl);
        const vp = v[t[pm]];
        let pi = pl, pj = pr - 1;
        sw(pm, pj);
        for (;;) {
          do { pi++; } while (v[t[pi]] < vp);
          do { pj--; } while (vp < v[t[pj]]);
          if (pi >= pj) break;
          sw(pi, pj);
        }
        sw(pi, pr - 1);
        if (pi - pl < pr - pi) { stack.push([pi + 1, pr]); pr = pi - 1; }
        else { stack.push([pl, pi - 1]); pl = pi + 1; }
      }
      for (let pi = pl + 1; pi <= pr; pi++) {
        const vi = t[pi], vp = v[vi];
        let pj = pi;
        while (pj > pl && vp < v[t[pj - 1]]) { t[pj] = t[pj - 1]; pj--; }
        t[pj] = vi;
      }
      const top = stack.pop();
      if (!top) break;
      [pl, pr] = top;
    }
  }
  return [...t.map((i) => idx[i]), ...nulls];
}

/** pandas `df.sort_values(dateColumn)` (quicksort) */
export function sortByDate<T>(rows: T[], key: (r: T) => number | null): T[] {
  return argsortQuick(rows.map(key)).map((i) => rows[i]);
}
