import { cookies } from "next/headers";

export type Period = "P1" | "P2";
export type Role = "collector" | "supervisor" | "cfo" | "admin";

export const PERIODS: Record<Period, { asOf: string; label: string; short: string; folder: string; month: MonthKey }> = {
  P1: { asOf: "2026-08-31", label: "31 Aug 2026", short: "31 Aug", folder: "P1_2026-08-31", month: "2026-08" },
  P2: { asOf: "2026-09-30", label: "30 Sep 2026", short: "30 Sep", folder: "P2_2026-09-30", month: "2026-09" },
};

export const ROLES: Record<Role, { label: string; person: string; home: string }> = {
  collector: { label: "Collector 2", person: "Collector 2", home: "/today" },
  supervisor: { label: "Supervisor", person: "Supervisor", home: "/today" },
  cfo: { label: "CFO", person: "CFO", home: "/cfo" },
  admin: { label: "Admin", person: "Admin", home: "/today" },
};

export function isPeriod(v: unknown): v is Period {
  return v === "P1" || v === "P2";
}
export function isRole(v: unknown): v is Role {
  return typeof v === "string" && v in ROLES;
}

// ---------- Months ----------
// The `duely_period` cookie holds either a data period ("P1" / "P2") or a month key ("2026-10")
// for a month whose month-end files have not been imported yet. Pages render an empty dashboard
// for such months; the chat, API routes and anything that needs engine numbers fall back to the
// nearest data period (see dataPeriodForMonth).

/** "YYYY-MM" */
export type MonthKey = string;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Months the user can open as dashboards (and browse in the calendar). */
export const MONTH_RANGE = { first: "2026-06", last: "2026-12" } as const;

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function inMonthRange(m: MonthKey): boolean {
  return m >= MONTH_RANGE.first && m <= MONTH_RANGE.last;
}

export function addMonths(m: MonthKey, n: number): MonthKey {
  const [y, mo] = m.split("-").map(Number);
  const t = y * 12 + (mo - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function monthList(): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m: MonthKey = MONTH_RANGE.first; m <= MONTH_RANGE.last; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** Last calendar day of a month as an ISO date (pure string maths, no clock). */
export function monthEnd(m: MonthKey): string {
  const [y, mo] = m.split("-").map(Number);
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return `${m}-${String(days).padStart(2, "0")}`;
}

export function monthLabel(m: MonthKey, short = false): string {
  const [y, mo] = m.split("-").map(Number);
  const name = MONTH_NAMES[mo - 1] ?? m;
  return `${short ? name.slice(0, 3) : name} ${y}`;
}

/** The data period whose month-end books are for this month, if any. */
export function periodForMonth(m: MonthKey): Period | null {
  return (Object.keys(PERIODS) as Period[]).find((p) => PERIODS[p].month === m) ?? null;
}

/** Nearest data period: the earliest one closing on or after this month, else the latest one. */
export function dataPeriodForMonth(m: MonthKey): Period {
  const ps = (Object.keys(PERIODS) as Period[]).sort((a, b) => PERIODS[a].month.localeCompare(PERIODS[b].month));
  return ps.find((p) => PERIODS[p].month >= m) ?? ps[ps.length - 1];
}

export interface MonthSelection {
  /** Selected month, "YYYY-MM". */
  month: MonthKey;
  /** Data period for this month, or null when nothing has been imported for it. */
  period: Period | null;
  /** Period to use for engine numbers, the chat and the API (nearest data period when the month is empty). */
  dataPeriod: Period;
  /** "August 2026" */
  label: string;
  /** "Aug 2026" */
  short: string;
  /** Demo "today": the data period's as-of date. */
  today: string;
}

export function selectionFor(m: MonthKey): MonthSelection {
  const period = periodForMonth(m);
  const dataPeriod = period ?? dataPeriodForMonth(m);
  return { month: m, period, dataPeriod, label: monthLabel(m), short: monthLabel(m, true), today: PERIODS[dataPeriod].asOf };
}

/** Normalise a raw cookie / form value into a cookie value: a Period, an in-range month key, or null. */
export function parsePeriodValue(v: unknown): Period | MonthKey | null {
  if (isPeriod(v)) return v;
  if (isMonthKey(v) && inMonthRange(v)) return periodForMonth(v) ?? v;
  return null;
}

/** The month the user is looking at, from the `duely_period` cookie (default P1). */
export async function getMonthSelection(): Promise<MonthSelection> {
  const v = parsePeriodValue((await cookies()).get("duely_period")?.value) ?? "P1";
  return selectionFor(isPeriod(v) ? PERIODS[v].month : v);
}

/** Data period for engine numbers. For an empty month this is the nearest data period. */
export async function getPeriodFromCookie(): Promise<Period> {
  return (await getMonthSelection()).dataPeriod;
}

export interface Session {
  role: Role;
  roleLabel: string;
  /** Collector name when role is collector; otherwise null (sees everyone). */
  collector: string | null;
  signedIn: boolean;
}

/** Demo session from cookies. Swap for Supabase auth later; keep the shape. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const r = jar.get("duely_role")?.value;
  const role: Role = isRole(r) ? r : "supervisor";
  const collector = role === "collector" ? jar.get("duely_collector")?.value || "Collector 2" : null;
  return { role, roleLabel: role === "collector" && collector ? collector : ROLES[role].label, collector, signedIn: isRole(r) };
}
