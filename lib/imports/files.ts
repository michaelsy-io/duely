// Month-end file recognition and validation, shared by the Import wizard (browser preview) and
// POST /api/import (the check that counts). Pure: no fs, no clock, no database.
import Papa from "papaparse";
import { dayLabel, monthEnd, monthLabel, type MonthKey } from "@/lib/months";

export interface TableSpec {
  label: string;
  /** Columns the engine needs. Header names are matched exactly or through SYN. */
  columns: string[];
  /** File-name hint used when guessing the table. */
  hint: RegExp;
  /** Not read by the engine: may be left out. */
  optional?: boolean;
}

/** The month-end tables (one file each), in the order the engine's SNAPSHOT_FILES lists them. */
export const TABLES: Record<string, TableSpec> = {
  customers: { label: "Customer master", columns: ["client_code", "segment", "area", "rep", "collector", "payment_terms_days", "credit_limit"], hint: /customer|client|master/i },
  sales_invoices: { label: "Sales invoices", columns: ["inv_no", "invoice_date", "due_date", "client_code", "net_amount"], hint: /sales|invoice/i },
  payments: { label: "Payments", columns: ["payment_id", "payment_date", "client_code", "applied_to_invoice", "amount"], hint: /payment|receipt|collection(?!_)/i },
  ar_aging: { label: "AR aging", columns: ["client_code", "inv_no", "invoice_date", "due_date", "balance", "days_overdue", "bucket"], hint: /aging|ageing|ar_/i },
  pdc_register: { label: "PDC register", columns: ["check_no_masked", "client_code", "amount", "check_date", "status"], hint: /pdc|check|cheque/i },
  bounced_checks: { label: "Bounced checks", columns: ["client_code", "amount", "date_returned", "replaced"], hint: /bounce|return/i },
  collection_activity: { label: "Collection activity", columns: ["activity_date", "client_code", "collector", "outcome", "promise_amount"], hint: /activity|contact|collection_/i },
  credit_memos: { label: "Credit memos", columns: ["memo_no", "memo_date", "client_code", "amount", "approver_role"], hint: /memo|credit/i },
  disputes: { label: "Disputes", columns: ["dispute_id", "client_code", "inv_no", "amount", "status"], hint: /dispute/i },
  gl_extract: { label: "GL extract", columns: ["account", "as_of", "balance"], hint: /gl|ledger/i },
  aging_loss_history: { label: "Aging loss history", columns: ["year_end", "bucket", "balance_at_year_end", "later_written_off"], hint: /loss/i },
  annual_sales_and_writeoffs: { label: "Annual sales and write-offs", columns: ["year", "net_credit_sales", "bad_debt_written_off"], hint: /annual/i },
  writeoff_history: { label: "Write-off history", columns: ["writeoff_date", "amount"], hint: /write.?off/i, optional: true },
};

export const TABLE_KEYS = Object.keys(TABLES);
export const REQUIRED_TABLES = TABLE_KEYS.filter((k) => !TABLES[k].optional);

/** Synonyms for header matching. */
export const SYN: Record<string, string[]> = {
  client_code: ["client_code", "customer code", "cust code", "customer id", "client id", "account no", "customer_no", "cust_id"],
  inv_no: ["inv_no", "invoice no", "invoice number", "invoice #", "si no", "doc no", "inv"],
  invoice_date: ["invoice_date", "inv date", "date issued", "doc date", "si date"],
  due_date: ["due_date", "due", "maturity", "date due"],
  balance: ["balance", "open amount", "amount due", "outstanding", "bal"],
  amount: ["amount", "amt", "value", "check amount", "payment amount"],
  days_overdue: ["days_overdue", "days past due", "dpd", "age days", "days late"],
  check_date: ["check_date", "cheque date", "date on check", "pdc date"],
  payment_date: ["payment_date", "date paid", "or date", "receipt date"],
  credit_limit: ["credit_limit", "limit", "credit line"],
  net_amount: ["net_amount", "net", "net sales", "amount net"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();
}

export function matchColumn(target: string, headers: string[]): { header: string | null; how: "exact" | "synonym" | "none" } {
  const exact = headers.find((h) => norm(h) === norm(target));
  if (exact) return { header: exact, how: "exact" };
  const syns = (SYN[target] ?? []).map(norm);
  const s = headers.find((h) => syns.includes(norm(h)) || syns.some((x) => norm(h).includes(x)));
  return s ? { header: s, how: "synonym" } : { header: null, how: "none" };
}

/** Best table for a file from its name and headers, or null when nothing fits. */
export function guessTable(name: string, headers: string[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  const base = name.toLowerCase();
  for (const [key, t] of Object.entries(TABLES)) {
    const hits = t.columns.filter((c) => matchColumn(c, headers).header).length / t.columns.length;
    const score = hits + (t.hint.test(name) ? 0.35 : 0) + (base.includes(key) ? 0.5 : 0) + (base.replace(/\.(csv|xlsx?)$/, "") === key ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

const DATE_COL = /date|due|as_of|year_end/i;
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;

/** First date in a date-like column that could be read day-first or month-first (e.g. 03/10/2026). */
export function ambiguousDate(rows: Record<string, string>[], headers: string[]): string | null {
  for (const h of headers.filter((x) => DATE_COL.test(x))) {
    for (const r of rows) {
      const v = r[h];
      const m = v?.match(DMY);
      if (m && Number(m[1]) <= 12 && Number(m[2]) <= 12) return v;
    }
  }
  return null;
}

export type DateFormat = "dmy" | "mdy";

/** "03/10/2026" → "2026-10-03" (dmy) or "2026-03-10" (mdy). ISO and blank values pass through. */
export function toIsoDate(v: string, fmt: DateFormat): string {
  const m = v.trim().match(DMY);
  if (!m) return v;
  const [a, b, y] = [Number(m[1]), Number(m[2]), m[3]];
  const [day, month] = fmt === "dmy" ? [a, b] : [b, a];
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface IncomingFile {
  name: string;
  /** CSV text (the wizard converts Excel sheets to CSV before sending). */
  text: string;
}

export interface PreparedFile {
  table: string;
  /** Stored file name, e.g. "ar_aging.csv". */
  file: string;
  /** The uploaded file name. */
  source: string;
  /** CSV text with canonical headers and ISO dates, ready for the engine. */
  text: string;
  rows: number;
  /** Header renames applied, your column → Duely field. */
  renamed: Record<string, string>;
}

export interface ImportCheck {
  ok: boolean;
  month: MonthKey;
  asOf: string;
  files: PreparedFile[];
  errors: string[];
  warnings: string[];
}

function parse(text: string) {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true, dynamicTyping: false });
  return { rows: res.data, headers: (res.meta.fields ?? []).map((h) => h.trim()) };
}

/**
 * Recognise, validate and normalise one month's files. Every required table must be present
 * exactly once with the columns the engine reads, dates must be ISO (or converted with the
 * chosen format), and the ledger extract must have the AR control balance at the month end.
 */
export function prepareImport(month: MonthKey, incoming: IncomingFile[], opts: { dateFormat?: DateFormat | null } = {}): ImportCheck {
  const asOf = monthEnd(month);
  const errors: string[] = [];
  const warnings: string[] = [];
  const byTable = new Map<string, PreparedFile>();

  for (const f of incoming) {
    const { rows, headers } = parse(f.text);
    const table = guessTable(f.name, headers);
    if (!table) {
      warnings.push(`${f.name} was not recognised and was left out.`);
      continue;
    }
    const spec = TABLES[table];
    if (byTable.has(table)) {
      errors.push(`Two files look like the ${spec.label}: ${byTable.get(table)!.source} and ${f.name}. Keep one.`);
      continue;
    }
    const renamed: Record<string, string> = {};
    const missing: string[] = [];
    for (const c of spec.columns) {
      const m = matchColumn(c, headers);
      if (!m.header) missing.push(c);
      else if (m.header !== c) renamed[m.header] = c;
    }
    if (missing.length) {
      errors.push(`${spec.label} (${f.name}) is missing ${missing.length === 1 ? "the column" : "columns"} ${missing.join(", ")}.`);
      continue;
    }
    if (rows.length === 0 && !spec.optional) warnings.push(`${spec.label} (${f.name}) has no rows.`);

    const sample = ambiguousDate(rows.slice(0, 200), headers);
    const needsDates = rows.some((r) => headers.some((h) => DATE_COL.test(h) && DMY.test(r[h] ?? "")));
    if (needsDates && !opts.dateFormat) {
      errors.push(`${spec.label} (${f.name}) has dates like ${sample ?? "01/02/2026"}. Say whether the day or the month comes first.`);
      continue;
    }

    let text = f.text.replace(/^﻿/, "");
    const rawHeaders = Papa.parse<string[]>(text, { preview: 1 }).data[0] ?? [];
    const headerTrimmed = rawHeaders.some((h) => h !== h.trim());
    if (Object.keys(renamed).length || needsDates || headerTrimmed) {
      const outHeaders = headers.map((h) => renamed[h] ?? h);
      const out = rows.map((r) =>
        headers.map((h) => {
          const v = (r[h] ?? "").trim();
          return needsDates && opts.dateFormat && DATE_COL.test(h) ? toIsoDate(v, opts.dateFormat) : v;
        }),
      );
      text = Papa.unparse({ fields: outHeaders, data: out });
    }
    byTable.set(table, { table, file: `${table}.csv`, source: f.name, text, rows: rows.length, renamed });
  }

  const missingTables = REQUIRED_TABLES.filter((t) => !byTable.has(t));
  if (missingTables.length) errors.push(`Still missing: ${missingTables.map((t) => TABLES[t].label).join(", ")}.`);

  // The books must be for this month: the ledger needs the AR control balance at the month end.
  const gl = byTable.get("gl_extract");
  if (gl) {
    const rows = parse(gl.text).rows;
    const ar = rows.filter((r) => /^accounts receivable/i.test(r.account ?? ""));
    if (!ar.some((r) => r.as_of === asOf)) {
      const latest = ar.map((r) => r.as_of).filter(Boolean).sort().pop();
      errors.push(
        latest
          ? `The ledger extract closes on ${dayLabel(latest)}, not ${dayLabel(asOf)}. These files are not ${monthLabel(month)}'s books.`
          : `The ledger extract has no accounts receivable control balance for ${dayLabel(asOf)}.`,
      );
    }
  }

  const files = TABLE_KEYS.map((t) => byTable.get(t)).filter((x): x is PreparedFile => !!x);
  return { ok: errors.length === 0, month, asOf, files, errors, warnings };
}
