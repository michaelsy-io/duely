import { cache } from "react";
import { getDemoResult } from "@/lib/engine/demo";
import type { FullEngineResult } from "@/lib/engine";
import { buildMockResult } from "@/lib/mock-result";
import { getPeriodFromCookie as periodCookie, type Period } from "@/lib/session";

export type { Period };
export type AppResult = FullEngineResult & { source: "engine" | "mock" };
export const getPeriodFromCookie = periodCookie;

/** Last-resort fallback: the hand-typed P1 mock, padded to the full engine shape. */
function mockAsFull(period: Period): FullEngineResult {
  const m = buildMockResult(period);
  const pdcsAll = m.pdcs.map((p) => ({ ...p, inCalendar: true, invoices_covered: null }));
  return {
    ...m,
    kpis: { ...m.kpis, writeOffPctByYear: [], monthSales: 0, monthCollections: 0 },
    flags: m.flags.map((f) => ({ ...f, kind: f.flag.toLowerCase().replace(/\W+/g, "_"), client_code: /^C\d{3}/.test(f.who) ? f.who.slice(0, 4) : null })),
    pdcs: pdcsAll,
    pdcsAll,
    pdcSummary: { count: pdcsAll.length, total: pdcsAll.reduce((a, p) => a + p.amount, 0), horizon: m.inflow[3]?.end ?? m.asOf },
    escalations: m.escalations.map((e) => ({ ...e, triggerText: e.triggers.join("; "), recommendedAction: e.action === "Credit hold" ? "Credit-hold review" : "Visit; inform sales rep", approver: e.action === "Credit hold" ? "Middle management, then top" : "Collections supervisor" })),
    onHold: m.onHold.map((o) => ({ ...o, inv_no: null })),
    netted: [],
    quantiles: { q80: 0, q50: 0 },
    writeOffCandidates: m.writeOffCandidates ?? [],
  };
}

/** Engine result for a demo period (real engine; mock only if the engine throws). */
export const getResult = cache(async (period: Period): Promise<AppResult> => {
  try {
    return { ...getDemoResult(period), source: "engine" };
  } catch (e) {
    console.error("[duely] engine failed, using mock:", e);
    return { ...mockAsFull(period), source: "mock" };
  }
});

export async function getCurrentResult() {
  const period = await getPeriodFromCookie();
  return { period, result: await getResult(period) };
}
