import Papa from "papaparse";
import type { Snapshot, ISODate } from "./types";

export type RawRow = Record<string, string | number | null>;

/** Parse CSV text into row objects. Empty cells become null; everything else stays a string. */
export function parseCsv(text: string): RawRow[] {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return res.data.map((r) => {
    const o: RawRow = {};
    for (const [k, v] of Object.entries(r)) o[k.trim()] = v === undefined || v === "" ? null : v;
    return o;
  });
}

export const SNAPSHOT_FILES = [
  "customers.csv",
  "sales_invoices.csv",
  "payments.csv",
  "ar_aging.csv",
  "pdc_register.csv",
  "bounced_checks.csv",
  "collection_activity.csv",
  "credit_memos.csv",
  "disputes.csv",
  "gl_extract.csv",
  "aging_loss_history.csv",
  "annual_sales_and_writeoffs.csv",
  "writeoff_history.csv",
] as const;

/** Build a Snapshot from a map of file name -> CSV text (table key = file name without .csv). */
export function snapshotFromCsv(asOf: ISODate, files: Record<string, string>): Snapshot {
  const tables: Snapshot["tables"] = {};
  for (const [name, text] of Object.entries(files)) tables[name.replace(/\.csv$/, "")] = parseCsv(text);
  return { asOf, tables };
}
