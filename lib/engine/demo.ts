// Demo data loader: reads data/demo/<period>/ CSVs from disk (server only).
import fs from "node:fs";
import path from "node:path";
import type { Snapshot } from "./types";
import { snapshotFromCsv, SNAPSHOT_FILES } from "./csv";
import { runEngine, type FullEngineResult } from "./index";

export type DemoPeriod = "P1" | "P2";

export const DEMO_PERIODS: Record<DemoPeriod, { folder: string; asOf: string }> = {
  P1: { folder: "P1_2026-08-31", asOf: "2026-08-31" },
  P2: { folder: "P2_2026-09-30", asOf: "2026-09-30" },
};

const snapCache = new Map<DemoPeriod, Snapshot>();
const resultCache = new Map<DemoPeriod, FullEngineResult>();

export function getDemoSnapshot(period: DemoPeriod): Snapshot {
  const hit = snapCache.get(period);
  if (hit) return hit;
  const { folder, asOf } = DEMO_PERIODS[period];
  const dir = path.join(process.cwd(), "data/demo", folder);
  const files: Record<string, string> = {};
  for (const f of SNAPSHOT_FILES) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) files[f] = fs.readFileSync(p, "utf8");
  }
  const snap = snapshotFromCsv(asOf, files);
  snapCache.set(period, snap);
  return snap;
}

export function getDemoResult(period: DemoPeriod): FullEngineResult {
  const hit = resultCache.get(period);
  if (hit) return hit;
  const res = period === "P2" ? runEngine(getDemoSnapshot("P2"), getDemoSnapshot("P1")) : runEngine(getDemoSnapshot("P1"));
  resultCache.set(period, res);
  return res;
}
