// Imported month-end files (table month_imports, one row per month + file). Same pattern as
// drafts.ts: Supabase when configured and reachable, otherwise a process-wide in-memory store
// (a "demo-session import": it lasts until the server restarts and is not shared between
// server instances).
import { cache } from "react";
import { getDb, warn } from "./server";
import type { MonthKey } from "@/lib/months";

export interface ImportFileRow {
  month: MonthKey;
  file: string;
  content: string;
  rows: number;
  imported_at: string;
  imported_by: string | null;
}

export interface MonthImport {
  month: MonthKey;
  files: { file: string; rows: number }[];
  rows: number;
  imported_at: string;
  imported_by: string | null;
  /** Where the files live: "db" (Supabase) or "memory" (this server instance only). */
  store: "db" | "memory";
}

type Mem = Map<MonthKey, ImportFileRow[]>;
const g = globalThis as typeof globalThis & { __duelyImports?: Mem };
function mem(): Mem {
  g.__duelyImports ??= new Map();
  return g.__duelyImports;
}

function summarise(month: MonthKey, rows: Omit<ImportFileRow, "content">[], store: MonthImport["store"]): MonthImport {
  const latest = rows.reduce((a, r) => (r.imported_at > a.imported_at ? r : a), rows[0]);
  return {
    month,
    files: rows.map((r) => ({ file: r.file, rows: r.rows })).sort((a, b) => a.file.localeCompare(b.file)),
    rows: rows.reduce((a, r) => a + (r.rows ?? 0), 0),
    imported_at: latest.imported_at,
    imported_by: latest.imported_by,
    store,
  };
}

/** Every imported month (no file contents). Fails soft: database errors fall back to the in-memory store. */
export async function listImports(): Promise<MonthImport[]> {
  const out = new Map<MonthKey, MonthImport>();
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("month_imports").select("month, file, rows, imported_at, imported_by");
      if (error) throw error;
      const by = new Map<MonthKey, Omit<ImportFileRow, "content">[]>();
      for (const r of (data ?? []) as Omit<ImportFileRow, "content">[]) by.set(r.month, [...(by.get(r.month) ?? []), r]);
      for (const [m, rows] of by) out.set(m, summarise(m, rows, "db"));
    } catch (e) {
      warn("listImports", e);
    }
  }
  for (const [m, rows] of mem()) if (!out.has(m) && rows.length) out.set(m, summarise(m, rows, "memory"));
  return [...out.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Imported months for this request (one listing per request). */
export const listImportsCached = cache(listImports);

/** Month keys that have imported files, cached per request; [] if anything goes wrong. */
export const importedMonthKeys = cache(async (): Promise<MonthKey[]> => {
  try {
    return (await listImportsCached()).map((m) => m.month);
  } catch {
    return [];
  }
});

/** File name → CSV text for one imported month, or null when the month has no import. */
export async function getImportFiles(month: MonthKey): Promise<Record<string, string> | null> {
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("month_imports").select("file, content").eq("month", month);
      if (error) throw error;
      if (data && data.length) return Object.fromEntries((data as { file: string; content: string }[]).map((r) => [r.file, r.content]));
    } catch (e) {
      warn("getImportFiles", e);
    }
  }
  const rows = mem().get(month);
  return rows?.length ? Object.fromEntries(rows.map((r) => [r.file, r.content])) : null;
}

/**
 * Store a month's files, replacing any earlier import of that month (files left out of the new
 * set are removed). Returns where they were stored.
 */
export async function saveImport(month: MonthKey, files: { file: string; content: string; rows: number }[], by: string | null): Promise<"db" | "memory"> {
  const imported_at = new Date().toISOString();
  const rows: ImportFileRow[] = files.map((f) => ({ month, file: f.file, content: f.content, rows: f.rows, imported_at, imported_by: by }));
  const db = getDb();
  if (db) {
    try {
      const { error } = await db.from("month_imports").upsert(rows, { onConflict: "month,file" });
      if (error) throw error;
      const keep = files.map((f) => f.file);
      const { error: delErr } = await db.from("month_imports").delete().eq("month", month).not("file", "in", `(${keep.map((f) => `"${f}"`).join(",")})`);
      if (delErr) warn("saveImport (remove old files)", delErr);
      mem().delete(month);
      return "db";
    } catch (e) {
      warn("saveImport", e);
    }
  }
  mem().set(month, rows);
  return "memory";
}

/** Remove a month's imported files (database and memory). Returns false when nothing was there. */
export async function deleteImport(month: MonthKey): Promise<boolean> {
  let found = mem().delete(month);
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("month_imports").delete().eq("month", month).select("file");
      if (error) throw error;
      if (data && data.length) found = true;
    } catch (e) {
      warn("deleteImport", e);
    }
  }
  return found;
}
