// Imported month-end books as engine inputs (server only).
// An imported month is a data period whose id is its month key ("2026-10"). Its snapshot is built
// from the stored CSV text with the as-of date set to the month end, and the engine runs on it
// exactly as for the bundled periods (previous month's books, when available, as the comparison).
import { getDemoSnapshot } from "@/lib/engine/demo";
import { runEngine, type FullEngineResult } from "@/lib/engine";
import { parseCsv, snapshotFromCsv, type RawRow } from "@/lib/engine/csv";
import type { Snapshot } from "@/lib/engine/types";
import { addMonths, monthEnd, type MonthKey } from "@/lib/months";
import { getImportFiles, listImportsCached, type MonthImport } from "@/lib/db/imports";

const BUNDLED_MONTHS: Record<MonthKey, "P1" | "P2"> = { "2026-08": "P1", "2026-09": "P2" };

interface Loaded {
  month: MonthKey;
  /** imported_at of the stored files; a re-import changes it and invalidates this entry. */
  version: string;
  files: Record<string, string>;
  snapshot: Snapshot;
  result?: FullEngineResult;
  raw: Map<string, RawRow[]>;
  text: Map<string, Record<string, string>[]>;
}

const g = globalThis as typeof globalThis & { __duelyLoaded?: Map<MonthKey, Loaded> };
function loaded(): Map<MonthKey, Loaded> {
  g.__duelyLoaded ??= new Map();
  return g.__duelyLoaded;
}

/**
 * Make sure every imported month is loaded at its current version, and drop months that were
 * reverted. Call from any async entry point; the sync helpers below then see every import.
 * Fails soft: on any error the cache is left as it was.
 */
export async function preloadImports(list?: MonthImport[]): Promise<void> {
  try {
    const imports = list ?? (await listImportsCached());
    const cacheMap = loaded();
    const live = new Set(imports.map((i) => i.month));
    for (const m of [...cacheMap.keys()]) if (!live.has(m)) cacheMap.delete(m);
    await Promise.all(
      imports.map(async (imp) => {
        const hit = cacheMap.get(imp.month);
        if (hit && hit.version === imp.imported_at) return;
        const files = await getImportFiles(imp.month);
        if (!files) return void cacheMap.delete(imp.month);
        cacheMap.set(imp.month, { month: imp.month, version: imp.imported_at, files, snapshot: snapshotFromCsv(monthEnd(imp.month), files), raw: new Map(), text: new Map() });
        // results of later months compared against this one are now stale
        for (const other of cacheMap.values()) if (other.month > imp.month) other.result = undefined;
      }),
    );
  } catch (e) {
    console.warn("[duely] could not load imported months:", (e as Error)?.message ?? e);
  }
}

/** Forget a month (after a revert) so nothing serves its old numbers. */
export function forgetImport(month: MonthKey): void {
  loaded().delete(month);
  for (const other of loaded().values()) if (other.month > month) other.result = undefined;
}

/** Imported months currently loaded in this server instance. */
export function loadedImportMonths(): MonthKey[] {
  return [...loaded().keys()].sort();
}

export function isImportLoaded(month: MonthKey): boolean {
  return loaded().has(month);
}

function prevSnapshot(month: MonthKey): Snapshot | undefined {
  const prev = addMonths(month, -1);
  const bundled = BUNDLED_MONTHS[prev];
  if (bundled) return getDemoSnapshot(bundled);
  return loaded().get(prev)?.snapshot;
}

/** Run the engine on a month's files before they are stored (throws if the engine cannot read them). */
export function previewImportResult(month: MonthKey, files: Record<string, string>): FullEngineResult {
  return runEngine(snapshotFromCsv(monthEnd(month), files), prevSnapshot(month));
}

/** Engine result for a loaded imported month (computed once per import version), or null. */
export function importResult(month: MonthKey): FullEngineResult | null {
  const hit = loaded().get(month);
  if (!hit) return null;
  hit.result ??= runEngine(hit.snapshot, prevSnapshot(month));
  return hit.result;
}

/** Engine-style rows (empty cells as null) of one imported file. */
export function importRawTable(month: MonthKey, name: string): RawRow[] | null {
  const hit = loaded().get(month);
  if (!hit) return null;
  const key = name.replace(/\.csv$/, "");
  let rows = hit.raw.get(key);
  if (!rows) {
    rows = parseCsv(hit.files[`${key}.csv`] ?? "");
    hit.raw.set(key, rows);
  }
  return rows;
}

/** String rows (empty cells as "") of one imported file, for the detail views. */
export function importTextTable(month: MonthKey, name: string): Record<string, string>[] | null {
  const hit = loaded().get(month);
  if (!hit) return null;
  let rows = hit.text.get(name);
  if (!rows) {
    rows = importRawTable(month, name)!.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)])));
    hit.text.set(name, rows);
  }
  return rows;
}

/** Bring imported months up to date (one listing per request) and say whether this one is available. */
export async function ensureImport(month: MonthKey): Promise<boolean> {
  await preloadImports();
  return isImportLoaded(month);
}
