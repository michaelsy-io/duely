// Duely rules engine: pure, deterministic port of the answer-key reference.
import type { EngineResult, Snapshot } from "./types";
import { buildModel } from "./model";
import { computeBase, controlCheck } from "./aging";
import { computeKpis, computeInflow, computeReps, type KpisPlus } from "./kpis";
import { computeFollowUp, computeOnHold, type NettedRow } from "./score";
import { computePdcs, computeBouncedOpen, type PdcRowPlus, type PdcSummary } from "./pdc";
import { computeEscalations, type EscalationRowPlus } from "./escalation";
import { computeFlags, type FlagRowPlus } from "./flags";

export type * from "./types";
export { parseCsv, snapshotFromCsv, SNAPSHOT_FILES } from "./csv";
export { peso, pct, fixed, grouped } from "./format";
export * as RULES from "./rules";

export interface FullEngineResult extends EngineResult {
  kpis: KpisPlus;
  flags: FlagRowPlus[];
  /** All checks on hand, sorted by check date. `pdcs` is the calendar subset (dated within 14 days, or flagged). */
  pdcsAll: PdcRowPlus[];
  pdcs: PdcRowPlus[];
  pdcSummary: PdcSummary;
  escalations: EscalationRowPlus[];
  onHold: (EngineResult["onHold"][number] & { inv_no: string | null })[];
  netted: NettedRow[];
  /** Amount-score cut-offs used for the follow-up list. */
  quantiles: { q80: number; q50: number };
  writeOffCandidates: { client_code: string; amount: number; reasons: string[] }[];
}

export function runEngine(snapshot: Snapshot, prev?: Snapshot): FullEngineResult {
  const m = buildModel(snapshot);
  const pm = prev ? buildModel(prev) : undefined;
  const b = computeBase(m);
  const kpis = computeKpis(m, b);
  const inflow = computeInflow(m, b);
  const reps = computeReps(m);
  const flags = computeFlags(m, b, inflow, kpis.estimatedBadDebt, pm);
  const fu = computeFollowUp(m, b);
  const pdc = computePdcs(m, b);
  return {
    asOf: snapshot.asOf,
    control: controlCheck(m, b),
    kpis,
    inflow,
    reps,
    flags,
    followUp: fu.rows,
    onHold: computeOnHold(b),
    pdcs: pdc.calendar,
    pdcsAll: pdc.all,
    pdcSummary: pdc.summary,
    bouncedOpen: computeBouncedOpen(m, b),
    escalations: computeEscalations(m, b, fu.rows, fu.od),
    netted: fu.netted,
    quantiles: { q80: fu.q80, q50: fu.q50 },
    writeOffCandidates: flags
      .filter((f) => f.kind === "write_off" && f.client_code)
      .map((f) => ({ client_code: f.client_code as string, amount: f.amount, reasons: f.rule.split("; ") })),
  };
}
