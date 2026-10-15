import { generateText } from "ai";
import { getModel, modelId } from "@/lib/ai/provider";
import { verifyNumbers } from "@/lib/ai/verify";
import { renderReport } from "@/lib/engine/report";
import { engine, nameOf, pctText, peso, shortDate, type Period } from "@/lib/ai/context";

export interface CfoSummary {
  period: Period;
  asOf: string;
  text: string;
  source: "ai" | "template";
  model?: string;
  verified: boolean;
  unknown: string[];
  facts: Record<string, unknown>;
}

export function cfoFacts(period: Period) {
  const r = engine(period);
  const k = r.kpis;
  return {
    period,
    asOf: r.asOf,
    kpis: {
      dso: Math.round(k.dso * 10) / 10,
      totalAr: k.totalAr,
      ledgerAr: k.ledgerAr,
      overdueExclDisputes: k.overdueExclDisputes,
      pctOver60: k.pctOver60,
      pctOver90: k.pctOver90,
      collectionEfficiency: k.collectionEfficiency,
      bouncedRate: k.bouncedRate,
      atRisk: k.atRisk,
      top10ShareAr: k.top10ShareAr,
      estimatedBadDebt: k.estimatedBadDebt,
      allowance: k.allowance,
      allowanceGap: k.estimatedBadDebt - k.allowance,
      buckets: k.buckets,
    },
    control: r.control,
    flags: r.flags.map((f) => {
      const code = (f as { client_code?: string | null }).client_code ?? null;
      return { flag: f.flag, who: f.who, client: code ? nameOf(code) : f.who, amount: f.amount, owner: f.owner };
    }),
    escalations: r.escalations.map((e) => ({ client_code: e.client_code, client: nameOf(e.client_code), action: e.action })),
    topFollowUp: r.followUp.slice(0, 5).map((f) => ({ client_code: f.client_code, client: nameOf(f.client_code), overdue: f.overdue, reasonText: f.reasonText })),
    inflow: r.inflow.map((w) => ({ label: w.label, start: w.start, total: w.total })),
  };
}

export function templateSummary(f: ReturnType<typeof cfoFacts>): string {
  const k = f.kpis;
  const lines = [
    `As of ${shortDate(f.asOf, true)}: total AR ${peso(k.totalAr)}, DSO ${k.dso} days, ${pctText(k.pctOver60)} over 60 days and ${pctText(k.pctOver90)} over 90 days. Overdue excluding disputes is ${peso(k.overdueExclDisputes)}; collection efficiency ${pctText(k.collectionEfficiency)}.`,
    k.allowanceGap > 0
      ? `Estimated bad debt is ${peso(k.estimatedBadDebt)} against an allowance of ${peso(k.allowance)} — a shortfall of ${peso(k.allowanceGap)}.`
      : `Allowance of ${peso(k.allowance)} covers estimated bad debt of ${peso(k.estimatedBadDebt)}.`,
    Math.abs(f.control.gap) >= 0.5 ? `Aging vs ledger gap: ${peso(f.control.gap)}.` : `Aging reconciles to the ledger.`,
  ];
  if (f.flags.length) lines.push(`Flags (${f.flags.length}): ${f.flags.slice(0, 5).map((x) => `${x.flag} — ${x.client} ${peso(x.amount)}`).join("; ")}.`);
  if (f.escalations.length) lines.push(`Escalations: ${f.escalations.map((e) => `${e.client} (${e.action})`).join("; ")}.`);
  return lines.join("\n\n");
}

/** CFO summary: AI writes the words, every number is checked against the engine facts. */
export async function cfoSummary(period: Period): Promise<CfoSummary> {
  const facts = cfoFacts(period);
  const base = { period, asOf: facts.asOf, facts };
  const model = getModel("smart");
  if (model) {
    let report = "";
    try {
      report = renderReport(engine(period) as Parameters<typeof renderReport>[0]);
    } catch {
      report = "";
    }
    try {
      const { text } = await generateText({
        model,
        system:
          "You are writing a short month-end receivables summary for the CFO of an ophthalmic distributor. 4–6 sentences or bullets: headline health, what changed/needs attention, the flags and escalations that need a decision. Use ONLY numbers from FACTS, formatted like ₱1,234,567, 45.2% (fractions are 0..1, multiply by 100), and 31 Aug 2026. Never compute new totals or differences that are not in FACTS.",
        prompt: `FACTS:\n${JSON.stringify(facts)}\n\nFULL MONTH REPORT (engine output, for context):\n${report}`,
      });
      const v = verifyNumbers(text, { facts, report });
      if (v.ok) return { ...base, text: text.trim(), source: "ai", model: modelId("smart") ?? undefined, verified: true, unknown: [] };
      console.warn("[cfo-summary] AI text failed number check", v.unknown);
    } catch (e) {
      console.warn("[cfo-summary] AI failed", e);
    }
  }
  const text = templateSummary(facts);
  const v = verifyNumbers(text, facts);
  return { ...base, text, source: "template", verified: v.ok, unknown: v.unknown };
}
