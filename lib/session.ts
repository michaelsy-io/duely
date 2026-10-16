import { cookies } from "next/headers";
import { addMonths, dayLabel, inMonthRange, isMonthKey, monthEnd, monthLabel, type MonthKey } from "@/lib/months";

export { addMonths, dayLabel, inMonthRange, isMonthKey, monthEnd, monthLabel, monthList, MONTH_RANGE, type MonthKey } from "@/lib/months";

/** The two bundled demo periods (data/demo/P1_2026-08-31, P2_2026-09-30). */
export type DemoPeriod = "P1" | "P2";
/** A month imported on the Import page: its id is the month key, e.g. "2026-10". */
export type ImportedPeriod = `${number}-${number}`;
/** A data period: a bundled demo period or an imported month. */
export type Period = DemoPeriod | ImportedPeriod;
export type Role = "collector" | "supervisor" | "cfo" | "admin";

export interface PeriodInfo {
  /** Books' as-of date (the month end). */
  asOf: string;
  /** "31 Aug 2026" */
  label: string;
  /** "31 Aug" */
  short: string;
  /** Bundled data folder; null for an imported month. */
  folder: string | null;
  month: MonthKey;
}

const DEMO_PERIODS: Record<DemoPeriod, PeriodInfo> = {
  P1: { asOf: "2026-08-31", label: "31 Aug 2026", short: "31 Aug", folder: "P1_2026-08-31", month: "2026-08" },
  P2: { asOf: "2026-09-30", label: "30 Sep 2026", short: "30 Sep", folder: "P2_2026-09-30", month: "2026-09" },
};

/** Facts about any data period. An imported month's as-of date is its month end. */
export function periodInfo(p: Period): PeriodInfo {
  if (isPeriod(p)) return DEMO_PERIODS[p];
  const asOf = monthEnd(p);
  return { asOf, label: dayLabel(asOf), short: dayLabel(asOf, true), folder: null, month: p };
}

/**
 * Period facts by id. The bundled periods are listed (Object.keys gives P1, P2); an imported
 * month key ("2026-10") is looked up through periodInfo, so `PERIODS[period].label` works for both.
 */
export const PERIODS = new Proxy(DEMO_PERIODS, {
  get(target, key) {
    if (typeof key === "string" && isMonthKey(key)) return periodInfo(key as ImportedPeriod);
    return Reflect.get(target, key);
  },
}) as Readonly<Record<DemoPeriod, PeriodInfo>> & Readonly<Record<Period, PeriodInfo>>;

export const ROLES: Record<Role, { label: string; person: string; home: string }> = {
  collector: { label: "Collecting Agent", person: "Collecting Agent", home: "/today" },
  supervisor: { label: "Supervisor", person: "Supervisor", home: "/today" },
  cfo: { label: "CFO", person: "CFO", home: "/cfo" },
  admin: { label: "Admin", person: "Admin", home: "/today" },
};

/** Latest bundled period (30 Sep 2026). For code with no request around; pages open on latestDataMonth(). */
export const DEFAULT_PERIOD: DemoPeriod = (Object.keys(DEMO_PERIODS) as DemoPeriod[]).reduce((a, b) => (DEMO_PERIODS[b].asOf > DEMO_PERIODS[a].asOf ? b : a));

/** Cookie holding the month picked this visit. Session-only, so every new visit opens on the latest month.
 * (Renamed from `duely_period`, which was kept for a year and pinned old browsers to 31 Aug.) */
export const PERIOD_COOKIE = "duely_month";

/** A bundled demo period id ("P1" / "P2"). Imported months are month keys (see isMonthKey). */
export function isPeriod(v: unknown): v is DemoPeriod {
  return v === "P1" || v === "P2";
}
export function isRole(v: unknown): v is Role {
  return typeof v === "string" && v in ROLES;
}

// ---------- Months ----------
// The `duely_month` cookie holds either a bundled period ("P1" / "P2") or a month key ("2026-10").
// A month key is a data period when that month has imported files (lib/db/imports.ts); otherwise
// pages render an empty dashboard, and the chat, API routes and anything that needs engine
// numbers fall back to the nearest data period (see dataPeriodForMonth).
// `imported` arguments are the month keys that have an import (importedMonthKeys()).

/** The data period whose month-end books are for this month, if any. */
export function periodForMonth(m: MonthKey, imported: readonly MonthKey[] = []): Period | null {
  const demo = (Object.keys(DEMO_PERIODS) as DemoPeriod[]).find((p) => DEMO_PERIODS[p].month === m);
  if (demo) return demo;
  return isMonthKey(m) && imported.includes(m) ? (m as ImportedPeriod) : null;
}

/** Every data period, oldest first. */
export function dataPeriods(imported: readonly MonthKey[] = []): Period[] {
  const ps: Period[] = [...(Object.keys(DEMO_PERIODS) as DemoPeriod[])];
  for (const m of imported) if (isMonthKey(m) && !ps.some((p) => PERIODS[p].month === m)) ps.push(m as ImportedPeriod);
  return ps.sort((a, b) => PERIODS[a].month.localeCompare(PERIODS[b].month));
}

/** Nearest data period: the earliest one closing on or after this month, else the latest one. */
export function dataPeriodForMonth(m: MonthKey): DemoPeriod;
export function dataPeriodForMonth(m: MonthKey, imported: readonly MonthKey[]): Period;
export function dataPeriodForMonth(m: MonthKey, imported: readonly MonthKey[] = []): Period {
  const ps = dataPeriods(imported);
  return ps.find((p) => PERIODS[p].month >= m) ?? ps[ps.length - 1];
}

/** The latest month with data: where the app opens when no month is picked this visit. */
export function latestDataMonth(imported: readonly MonthKey[] = []): MonthKey {
  const ps = dataPeriods(imported);
  return PERIODS[ps[ps.length - 1]].month;
}

/** The data period for the month before this one, if any (month-on-month comparisons). */
export function previousPeriod(p: Period, imported: readonly MonthKey[] = []): Period | null {
  return periodForMonth(addMonths(PERIODS[p].month, -1), imported);
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
  /** Months that have imported files. */
  imported: MonthKey[];
}

export function selectionFor(m: MonthKey, imported: readonly MonthKey[] = []): MonthSelection {
  const period = periodForMonth(m, imported);
  const dataPeriod = period ?? dataPeriodForMonth(m, imported);
  return { month: m, period, dataPeriod, label: monthLabel(m), short: monthLabel(m, true), today: PERIODS[dataPeriod].asOf, imported: [...imported] };
}

/** Normalise a raw cookie / form value into a cookie value: a bundled period, an in-range month key, or null. */
export function parsePeriodValue(v: unknown): DemoPeriod | MonthKey | null {
  if (isPeriod(v)) return v;
  if (isMonthKey(v) && inMonthRange(v)) return (periodForMonth(v) as DemoPeriod | null) ?? v;
  return null;
}

/** Month for a raw cookie value; with no valid value, the latest month with data. */
export function monthForCookieValue(v: unknown, imported: readonly MonthKey[] = []): MonthKey {
  const parsed = parsePeriodValue(v);
  if (!parsed) return latestDataMonth(imported);
  return isPeriod(parsed) ? DEMO_PERIODS[parsed].month : parsed;
}

/** The month the user is looking at, from the `duely_month` cookie (default: the latest month with data). */
export async function getMonthSelection(): Promise<MonthSelection> {
  // Loaded on demand so the middleware (which imports this module for ROLES) does not bundle the database client.
  const { importedMonthKeys } = await import("@/lib/db/imports");
  const [jar, imported] = await Promise.all([cookies(), importedMonthKeys()]);
  return selectionFor(monthForCookieValue(jar.get(PERIOD_COOKIE)?.value, imported), imported);
}

/** Data period for engine numbers. For an empty month this is the nearest data period. */
export async function getPeriodFromCookie(): Promise<Period> {
  return (await getMonthSelection()).dataPeriod;
}

/** Collectors as named in Kopi's customer file. Each has a demo login, shown as "Collecting Agent N". */
export const COLLECTORS = ["Collector 1", "Collector 2", "Collector 3"] as const;
export const DEFAULT_COLLECTOR = "Collector 2";

/** Display name for a collector from the data ("Collector 2" → "Collecting Agent 2"). */
export function agentName(collector: string): string {
  const m = /^Collector (\d+)$/.exec(collector);
  return m ? `Collecting Agent ${m[1]}` : collector;
}

/** A sign-in / "view as" choice: a role, or a specific collector ("collector-1"). */
export function parseRoleChoice(v: unknown): { role: Role; collector: string | null } | null {
  if (typeof v !== "string") return null;
  const m = /^collector-(\d+)$/.exec(v);
  if (m) {
    const c = `Collector ${m[1]}`;
    return (COLLECTORS as readonly string[]).includes(c) ? { role: "collector", collector: c } : null;
  }
  if (!isRole(v)) return null;
  return { role: v, collector: v === "collector" ? DEFAULT_COLLECTOR : null };
}

/** The choice id for a session (inverse of parseRoleChoice). */
export function roleChoiceId(s: { role: Role; collector: string | null }): string {
  return s.role === "collector" && s.collector ? `collector-${s.collector.replace(/\D/g, "")}` : s.role;
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
  const saved = jar.get("duely_collector")?.value;
  const collector = role === "collector" ? ((COLLECTORS as readonly string[]).includes(saved ?? "") ? saved! : DEFAULT_COLLECTOR) : null;
  return { role, roleLabel: collector ? agentName(collector) : ROLES[role].label, collector, signedIn: isRole(r) };
}
