import { describe, it, expect } from "vitest";
import { getDemoResult } from "../../lib/engine/demo";
import { answerKeySuite } from "./shared";

answerKeySuite("P1");

describe("P1 (as of 2026-08-31) key values", () => {
  const r = getDemoResult("P1");

  it("control check: ₱50,000 gap = unapplied payment OR-51760", () => {
    expect(r.asOf).toBe("2026-08-31");
    expect(Math.round(r.control.agingTotal)).toBe(102_764_253);
    expect(Math.round(r.control.ledgerAr)).toBe(102_714_253);
    expect(r.control.gap).toBeCloseTo(50_000, 2);
    expect(r.control.unappliedTotal).toBe(50_000);
    expect(r.control.unappliedRefs).toEqual(["OR-51760"]);
    expect(r.control.missingClients).toEqual([]);
  });

  it("KPIs", () => {
    const k = r.kpis;
    expect(k.dso.toFixed(1)).toBe("84.4");
    expect((k.pctOver60 * 100).toFixed(1)).toBe("1.1");
    expect((k.pctOver90 * 100).toFixed(1)).toBe("0.3");
    expect((k.collectionEfficiency * 100).toFixed(1)).toBe("62.1");
    expect(Math.round(k.overdueExclDisputes)).toBe(20_577_809);
    expect((k.bouncedRate * 100).toFixed(1)).toBe("0.9");
    expect(Math.round(k.atRisk)).toBe(431_617);
    expect((k.top10ShareAr * 100).toFixed(1)).toBe("59.8");
    expect((k.top10ShareOverdue * 100).toFixed(1)).toBe("81.2");
    expect(Math.round(k.estimatedBadDebt)).toBe(623_573);
    expect(k.allowance).toBe(650_000);
    expect(Math.round(k.buckets["90+"])).toBe(286_577);
    expect((k.lossRates["90+"] * 100).toFixed(2)).toBe("27.84");
  });

  it("inflow totals", () => {
    expect(r.inflow.map((w) => Math.round(w.total))).toEqual([8_130_791, 8_503_121, 6_276_157, 3_735_656]);
    expect(r.inflow[0].start).toBe("2026-09-01");
    expect(r.inflow[3].end).toBe("2026-09-28");
  });

  it("follow-up list: 24 rows, C014 #1 with score 75", () => {
    expect(r.followUp).toHaveLength(24);
    const top = r.followUp[0];
    expect([top.rank, top.client_code, top.score, top.oldestDays, Math.round(top.overdue)]).toEqual([1, "C014", 75, 65, 601_661]);
    expect(top.reasonText).toBe(
      "65 days overdue; broke a promise in the last 30 days; bounced check in last 12 months (not replaced); over credit limit (₱889,771 vs ₱450,000)",
    );
    expect(top.factors).toEqual([
      { label: "65 days overdue", points: 30 },
      { label: "Overdue amount in next 30%", points: 10 },
      { label: "Broke a promise in the last 30 days", points: 15 },
      { label: "Bounced check in last 12 months", points: 10 },
      { label: "Over credit limit", points: 10 },
    ]);
    expect(r.followUp.find((x) => x.client_code === "C012")?.overdue).toBeCloseTo(264_130, 0); // after ₱50,000 netting
    expect(r.netted).toEqual([{ client_code: "C012", amount: 50_000, dropsOff: false }]);
    expect(r.followUp.at(-1)?.client_code).toBe("C023");
  });

  it("escalations: 5 credit holds, 2 visits", () => {
    expect(r.escalations.map((e) => [e.client_code, e.action])).toEqual([
      ["C014", "Credit hold"], ["C002", "Credit hold"], ["C036", "Credit hold"], ["C005", "Visit"],
      ["C048", "Credit hold"], ["C040", "Credit hold"], ["C008", "Visit"],
    ]);
  });

  it("on hold, bounced, write-off candidates, PDCs", () => {
    expect(r.onHold).toEqual([{ client_code: "C019", inv_no: "INV-11932", amount: 86_400, reason: "Pricing - billed list price instead of contract price" }]);
    expect(r.bouncedOpen.map((b) => [b.client_code, b.amount, b.date_returned, b.daysAgo])).toEqual([["C014", 145_040, "2026-08-14", 17]]);
    expect(r.writeOffCandidates.map((w) => w.client_code)).toEqual(["C040"]);
    expect(r.pdcs).toHaveLength(25);
    expect(r.pdcSummary.count).toBe(33);
    expect(r.pdcs.every((p) => p.week >= 1 && p.week <= 2)).toBe(true);
  });

  it("no Sudden balance jump flag without a previous period", () => {
    expect(r.flags.some((f) => f.flag === "Sudden balance jump")).toBe(false);
  });
});
