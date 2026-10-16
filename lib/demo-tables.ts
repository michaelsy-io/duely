// Read-only helpers over the raw demo CSVs (data/demo/<period>/*.csv) for detail views.
// Numbers that drive decisions come from the engine; these are for listing source rows.
import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { DEFAULT_PERIOD, isPeriod, PERIODS, type Period } from "@/lib/session";
import { ensureImport, importTextTable } from "@/lib/imports/load";

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(field); field = "";
      if (cur.some((x) => x !== "")) lines.push(cur);
      cur = [];
    } else field += c;
  }
  if (field !== "" || cur.length) { cur.push(field); lines.push(cur); }
  const [head, ...rows] = lines;
  if (!head) return [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// Demo CSVs never change at runtime, so parse each file once per server instance.
const tableCache = new Map<string, Promise<Row[]>>();

export const readTable = cache(async (period: Period, name: string): Promise<Row[]> => {
  // Imported month: rows come from the stored files (bundled latest books if the import is gone).
  if (!isPeriod(period)) {
    if (await ensureImport(period)) return importTextTable(period, name) ?? [];
    period = DEFAULT_PERIOD;
  }
  const key = `${period}/${name}`;
  let hit = tableCache.get(key);
  if (!hit) {
    const file = path.join(process.cwd(), "data", "demo", PERIODS[period].folder ?? "", `${name}.csv`);
    hit = fs.readFile(file, "utf8").then(parseCsv, () => [] as Row[]);
    tableCache.set(key, hit);
  }
  return hit;
});

export interface Invoice { inv_no: string; invoice_date: string; due_date: string; balance: number; days_overdue: number; bucket: string }
export interface Activity { activity_date: string; collector: string; action: string; contact_role: string; outcome: string; promise_date: string; promise_amount: number | null }
export interface PdcRegisterRow { check_no: string; bank: string; amount: number; check_date: string; status: string; invoices: string }
export interface CustomerRow { client_code: string; segment: string; area: string; rep: string; collector: string; payment_terms_days: number; credit_limit: number; usual_payment_method: string; contact_role: string; client_since: string }

export async function customers(period: Period): Promise<CustomerRow[]> {
  return (await readTable(period, "customers")).map((r) => ({
    client_code: r.client_code, segment: r.segment, area: r.area, rep: r.rep, collector: r.collector,
    payment_terms_days: Number(r.payment_terms_days), credit_limit: Number(r.credit_limit),
    usual_payment_method: r.usual_payment_method, contact_role: r.contact_role, client_since: r.client_since,
  }));
}

export async function openInvoices(period: Period, code: string): Promise<Invoice[]> {
  return (await readTable(period, "ar_aging"))
    .filter((r) => r.client_code === code)
    .map((r) => ({ inv_no: r.inv_no, invoice_date: r.invoice_date, due_date: r.due_date, balance: Number(r.balance), days_overdue: Number(r.days_overdue), bucket: r.bucket }))
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function activity(period: Period, code: string): Promise<Activity[]> {
  return (await readTable(period, "collection_activity"))
    .filter((r) => r.client_code === code)
    .map((r) => ({
      activity_date: r.activity_date, collector: r.collector, action: r.action, contact_role: r.contact_role, outcome: r.outcome,
      promise_date: r.promise_date, promise_amount: r.promise_amount ? Number(r.promise_amount) : null,
    }))
    .sort((a, b) => b.activity_date.localeCompare(a.activity_date));
}

export async function pdcRegister(period: Period, code?: string): Promise<PdcRegisterRow[]> {
  return (await readTable(period, "pdc_register"))
    .filter((r) => !code || r.client_code === code)
    .map((r) => ({ check_no: r.check_no_masked, bank: r.bank, amount: Number(r.amount), check_date: r.check_date, status: r.status, invoices: r.invoices_covered }))
    .sort((a, b) => b.check_date.localeCompare(a.check_date));
}

/** Last contact date per client from the activity log. */
export async function lastContactByClient(period: Period): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const r of await readTable(period, "collection_activity")) {
    if (!out[r.client_code] || r.activity_date > out[r.client_code]) out[r.client_code] = r.activity_date;
  }
  return out;
}
