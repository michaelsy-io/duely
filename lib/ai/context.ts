import fs from "node:fs";
import path from "node:path";
import { getDemoResult } from "@/lib/engine/demo";
import { parseCsv, type RawRow } from "@/lib/engine/csv";
import type { EngineResult, FollowUpRow } from "@/lib/engine/types";
import { clientName, clientProfile } from "@/lib/clients";

export type Period = "P1" | "P2";
export const PERIOD_COOKIE = "duely_period";

export function normalizePeriod(p: unknown): Period | null {
  const s = String(p ?? "").toUpperCase();
  if (s.startsWith("P1")) return "P1";
  if (s.startsWith("P2")) return "P2";
  return null;
}

/** Period from explicit value, else `duely_period` cookie, else P1. Safe outside a request scope. */
export async function resolvePeriod(explicit?: unknown): Promise<Period> {
  const p = normalizePeriod(explicit);
  if (p) return p;
  try {
    const { cookies } = await import("next/headers");
    const c = (await cookies()).get(PERIOD_COOKIE)?.value;
    return normalizePeriod(c) ?? "P1";
  } catch {
    return "P1";
  }
}

export function engine(period: Period): EngineResult {
  return getDemoResult(period);
}

// ---------- raw demo CSVs (open invoices, activity history) ----------

const DEMO_ROOT = path.join(process.cwd(), "data", "demo");
const csvCache = new Map<string, RawRow[]>();

function periodDir(period: Period): string | null {
  try {
    const hit = fs.readdirSync(DEMO_ROOT).find((d) => d === period || d.startsWith(`${period}_`));
    return hit ? path.join(DEMO_ROOT, hit) : null;
  } catch {
    return null;
  }
}

export function readDemoCsv(period: Period, file: string): RawRow[] {
  const key = `${period}/${file}`;
  const cached = csvCache.get(key);
  if (cached) return cached;
  const dir = periodDir(period);
  let rows: RawRow[] = [];
  if (dir) {
    try {
      rows = parseCsv(fs.readFileSync(path.join(dir, file.endsWith(".csv") ? file : `${file}.csv`), "utf8"));
    } catch {
      rows = [];
    }
  }
  csvCache.set(key, rows);
  return rows;
}

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const str = (v: unknown) => (v == null ? null : String(v));

export interface OpenInvoice {
  inv_no: string;
  invoice_date: string | null;
  due_date: string | null;
  balance: number;
  days_overdue: number;
  bucket: string | null;
}

export function openInvoices(period: Period, client_code: string): OpenInvoice[] {
  return readDemoCsv(period, "ar_aging")
    .filter((r) => r.client_code === client_code && num(r.balance) > 0)
    .map((r) => ({
      inv_no: String(r.inv_no),
      invoice_date: str(r.invoice_date),
      due_date: str(r.due_date),
      balance: num(r.balance),
      days_overdue: num(r.days_overdue),
      bucket: str(r.bucket),
    }))
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

export interface ActivityRow {
  date: string | null;
  collector: string | null;
  action: string | null;
  outcome: string | null;
  promise_date: string | null;
  promise_amount: number | null;
}

export function activityHistory(period: Period, client_code: string, limit = 6): ActivityRow[] {
  return readDemoCsv(period, "collection_activity")
    .filter((r) => r.client_code === client_code)
    .map((r) => ({
      date: str(r.activity_date),
      collector: str(r.collector),
      action: str(r.action),
      outcome: str(r.outcome),
      promise_date: str(r.promise_date),
      promise_amount: r.promise_amount == null ? null : num(r.promise_amount),
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
}

export function bouncedChecks(period: Period, client_code: string) {
  return readDemoCsv(period, "bounced_checks")
    .filter((r) => r.client_code === client_code)
    .map((r) => ({
      check_no: String(r.check_no_masked),
      invoices_covered: str(r.invoices_covered),
      amount: num(r.amount),
      date_returned: str(r.date_returned),
      reason: str(r.reason),
      replaced: r.replaced === "Y",
    }));
}

export function nameOf(code: string): string {
  try {
    return clientName(code);
  } catch {
    return code;
  }
}

export function contactOf(code: string) {
  try {
    const p = clientProfile(code);
    return p ? { name: p.name, contact_person: p.contact_person, contact_role: p.contact_role, email: p.email, phone: p.phone } : null;
  } catch {
    return null;
  }
}

export function followUpRow(period: Period, client_code: string): FollowUpRow | undefined {
  return engine(period).followUp.find((r) => r.client_code === client_code);
}

/** Add n days to an ISO date (UTC, no local clock). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "31 Aug" / "31 Aug 2026" */
export function shortDate(iso: string | null | undefined, withYear = false): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MON[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** ₱1,234,567 (rounded to the peso) */
export function peso(n: number): string {
  const s = Math.round(Math.abs(n)).toLocaleString("en-US");
  return `${n < 0 ? "-" : ""}₱${s}`;
}

export function pctText(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
