// Calendar events for one month, derived only from engine output and the raw demo rows.
// Pure: no clock, no I/O. Sums here are plain totals of source rows (same as lib/view.ts).
import type { FullEngineResult } from "@/lib/engine";
import { RULES } from "@/lib/engine";
import { clientName } from "@/lib/clients";
import { fmtDate, peso } from "@/lib/format";
import { addMonths, monthEnd, PERIODS, type MonthKey, type Period } from "@/lib/session";

type Row = Record<string, string>;

export type EventKind = "bounced" | "missed" | "review" | "close" | "check" | "promise" | "invoice";
export type EventTone = "bad" | "warn" | "good" | "primary" | "orange" | "neutral";

export interface CalEvent {
  kind: EventKind;
  date: string;
  client_code: string | null;
  title: string;
  detail: string;
  amount: number | null;
  amountText: string | null;
  status: string;
  tone: EventTone;
  href: string;
}

/** Legend order = priority order inside a day. */
export const EVENT_KINDS: { kind: EventKind; label: string; plural: string; href: string }[] = [
  { kind: "bounced", label: "Bounced check", plural: "Bounced checks", href: "/checks" },
  { kind: "missed", label: "Missed promise", plural: "Missed promises", href: "/today?f=escalate" },
  { kind: "close", label: "Month-end close", plural: "Month-end close", href: "/cfo" },
  { kind: "review", label: "Escalation review", plural: "Escalation reviews", href: "/approvals" },
  { kind: "check", label: "Check dated", plural: "Checks dated", href: "/checks" },
  { kind: "promise", label: "Promise to pay", plural: "Promises to pay", href: "/today" },
  { kind: "invoice", label: "Invoice due", plural: "Invoices due", href: "/clients" },
];
const ORDER = Object.fromEntries(EVENT_KINDS.map((k, i) => [k.kind, i])) as Record<EventKind, number>;

export interface SourceData {
  period: Period;
  result: Pick<FullEngineResult, "asOf" | "kpis" | "pdcsAll" | "bouncedOpen" | "escalations" | "followUp">;
  pdcRegister: Row[];
  aging: Row[];
  activity: Row[];
  bounced: Row[];
}

export interface MonthSummary {
  checks: { count: number; total: number; bounced: number };
  invoices: { count: number; total: number; overdue: number };
  promises: { count: number; total: number; missed: number };
  bounced: { count: number; total: number; open: number };
  reviews: number;
}

export interface MonthData {
  month: MonthKey;
  /** Events keyed by ISO date, sorted by priority within the day. */
  days: Record<string, CalEvent[]>;
  summary: MonthSummary;
  source: { period: Period; label: string; asOf: string };
  /** True when month-end books for this month have been imported. */
  hasData: boolean;
}

const inMonth = (iso: string | undefined | null, m: MonthKey) => !!iso && iso.slice(0, 7) === m;
const num = (s: string | undefined) => (s ? Number(s) : 0) || 0;

export function buildMonth(month: MonthKey, src: SourceData): MonthData {
  const asOf = src.result.asOf;
  const events: CalEvent[] = [];
  const s: MonthSummary = {
    checks: { count: 0, total: 0, bounced: 0 },
    invoices: { count: 0, total: 0, overdue: 0 },
    promises: { count: 0, total: 0, missed: 0 },
    bounced: { count: 0, total: 0, open: 0 },
    reviews: 0,
  };
  const client = (code: string) => ({ client_code: code, title: clientName(code), href: `/clients/${code}` });

  // Post-dated checks, by check date.
  const onHand = new Map(src.result.pdcsAll.map((p) => [`${p.check_no}|${p.check_date}`, p]));
  for (const r of src.pdcRegister) {
    if (!inMonth(r.check_date, month)) continue;
    const amount = num(r.amount);
    s.checks.count++;
    s.checks.total += amount;
    const base = { ...client(r.client_code), date: r.check_date, amount, amountText: peso(amount) };
    const ref = `Check ${r.check_no_masked} · ${r.bank}`;
    if (/bounced/i.test(r.status)) {
      s.checks.bounced++;
      events.push({ ...base, kind: "bounced", detail: `${ref} · dated today, bounced`, status: "Bounced", tone: "bad" });
      continue;
    }
    const eng = onHand.get(`${r.check_no_masked}|${r.check_date}`);
    const past = eng?.flags.some((f) => /PAST/i.test(f));
    const status = /on hand/i.test(r.status) ? (past ? "Deposit now" : "On hand") : r.status || "Recorded";
    const tone: EventTone = past ? "warn" : /cleared/i.test(status) ? "good" : "primary";
    const extra = eng?.flags.filter((f) => !/PAST/i.test(f)).join(" · ");
    events.push({ ...base, kind: "check", detail: extra ? `${ref} · ${extra}` : ref, status, tone });
  }

  // Bounced checks, by date returned.
  const openBounce = new Map(src.result.bouncedOpen.map((b) => [`${b.client_code}|${b.date_returned}`, b]));
  for (const r of src.bounced) {
    if (!inMonth(r.date_returned, month)) continue;
    const amount = num(r.amount);
    const replaced = /^y/i.test(r.replaced);
    const open = openBounce.get(`${r.client_code}|${r.date_returned}`);
    s.bounced.count++;
    s.bounced.total += amount;
    if (!replaced) s.bounced.open++;
    events.push({
      ...client(r.client_code), kind: "bounced", date: r.date_returned, amount, amountText: peso(amount),
      detail: `Check ${r.check_no_masked} returned · ${r.reason}${open ? ` · ${open.daysAgo} days ago at ${fmtDate(asOf, "d MMM")}` : ""}`,
      status: replaced ? `Replaced ${fmtDate(r.replacement_received, "d MMM")}` : "Not replaced",
      tone: replaced ? "good" : "bad",
    });
  }

  // Open invoices falling due (open balance in the source books).
  for (const r of src.aging) {
    const bal = num(r.balance);
    if (!inMonth(r.due_date, month) || bal <= 0) continue;
    s.invoices.count++;
    s.invoices.total += bal;
    const overdue = r.due_date <= asOf && num(r.days_overdue) > 0;
    if (overdue) s.invoices.overdue++;
    events.push({
      ...client(r.client_code), kind: "invoice", date: r.due_date, amount: bal, amountText: peso(bal),
      detail: `${r.inv_no} · issued ${fmtDate(r.invoice_date, "d MMM")}`,
      status: overdue ? `Unpaid, ${r.days_overdue}d late at ${fmtDate(asOf, "d MMM")}` : r.due_date <= asOf ? "Due" : "Falling due",
      tone: overdue ? "warn" : "neutral",
    });
  }

  // Promises to pay, by promised date. A promise counts as missed when the collector later logged "Promise missed".
  const prefix = RULES.ESCALATION.brokenPromiseOutcomePrefix;
  for (const r of src.activity) {
    if (!inMonth(r.promise_date, month)) continue;
    const amount = r.promise_amount ? num(r.promise_amount) : null;
    const missed = r.promise_date <= asOf && src.activity.some(
      (a) => a.client_code === r.client_code && a.activity_date >= r.promise_date && a.activity_date <= asOf && (a.outcome ?? "").startsWith(prefix),
    );
    s.promises.count++;
    s.promises.total += amount ?? 0;
    if (missed) s.promises.missed++;
    events.push({
      ...client(r.client_code), kind: missed ? "missed" : "promise", date: r.promise_date, amount, amountText: amount == null ? null : peso(amount),
      detail: `Promised ${fmtDate(r.activity_date, "d MMM")} by ${r.collector} (${r.action})`,
      status: missed ? "Missed" : r.promise_date > asOf ? "Due" : "Date passed",
      tone: missed ? "orange" : r.promise_date > asOf ? "good" : "neutral",
    });
  }

  // Month-end close and the escalation reviews it triggers, on the as-of date.
  if (inMonth(asOf, month)) {
    const k = src.result.kpis;
    events.push({
      kind: "close", date: asOf, client_code: null, title: "Month-end close", href: "/cfo",
      detail: `Books as of ${PERIODS[src.period].label} · total receivables`, amount: k.totalAr, amountText: peso(k.totalAr),
      status: `${src.result.escalations.length} reviews`, tone: "primary",
    });
    const overdue = new Map(src.result.followUp.map((f) => [f.client_code, f.overdue]));
    for (const e of src.result.escalations) {
      s.reviews++;
      const amt = overdue.get(e.client_code) ?? null;
      events.push({
        ...client(e.client_code), kind: "review", date: asOf, amount: amt, amountText: amt == null ? null : peso(amt),
        detail: e.triggerText, status: e.recommendedAction,
        tone: /hold/i.test(e.action) ? "bad" : /visit/i.test(e.action) ? "warn" : "neutral",
      });
    }
  }

  const days: Record<string, CalEvent[]> = {};
  for (const e of events) (days[e.date] ??= []).push(e);
  for (const list of Object.values(days)) list.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (b.amount ?? 0) - (a.amount ?? 0));

  return {
    month,
    days,
    summary: s,
    source: { period: src.period, label: PERIODS[src.period].label, asOf },
    hasData: PERIODS[src.period].month === month,
  };
}

/** Mon-first grid of ISO dates covering the month (leading/trailing days from neighbours). */
export function monthGrid(month: MonthKey): { iso: string; inMonth: boolean }[] {
  const [y, m] = month.split("-").map(Number);
  // Day of week via Zeller-style maths on the 1st (0 = Monday). Pure, no Date clock reads.
  const dow = (yy: number, mm: number, dd: number) => {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const yr = mm < 3 ? yy - 1 : yy;
    const sun0 = (yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) + t[mm - 1] + dd) % 7;
    return (sun0 + 6) % 7;
  };
  const len = (k: MonthKey) => Number(monthEnd(k).slice(8));
  const lead = dow(y, m, 1);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const out: { iso: string; inMonth: boolean }[] = [];
  for (let i = lead; i > 0; i--) out.push({ iso: `${prev}-${String(len(prev) - i + 1).padStart(2, "0")}`, inMonth: false });
  for (let d = 1; d <= len(month); d++) out.push({ iso: `${month}-${String(d).padStart(2, "0")}`, inMonth: true });
  for (let d = 1; out.length % 7 !== 0; d++) out.push({ iso: `${next}-${String(d).padStart(2, "0")}`, inMonth: false });
  return out;
}

