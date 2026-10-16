// Month-key helpers ("YYYY-MM"). Pure string maths, no clock, safe in client and server code.
// lib/session.ts re-exports these; client components (the import wizard) import them from here.

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

/** "2026-10-31" → "31 Oct 2026" (or "31 Oct" when short). */
export function dayLabel(iso: string, short = false): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const name = MONTH_NAMES[mo - 1]?.slice(0, 3) ?? "";
  return short ? `${d} ${name}` : `${d} ${name} ${y}`;
}
