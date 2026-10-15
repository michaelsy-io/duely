import { describe, it, expect } from "vitest";
import { getDemoResult, getDemoSnapshot } from "../../lib/engine/demo";
import { runEngine } from "../../lib/engine";
import { answerKeySuite } from "./shared";

answerKeySuite("P2");

describe("P2 (as of 2026-09-30, P1 as prev) key values", () => {
  const r = getDemoResult("P2");

  it("control check ties", () => {
    expect(r.asOf).toBe("2026-09-30");
    expect(Math.round(r.control.agingTotal)).toBe(107_925_379);
    expect(Math.abs(r.control.gap)).toBeLessThan(0.5);
    expect(r.control.unappliedRefs).toEqual([]);
  });

  it("KPIs", () => {
    const k = r.kpis;
    expect(k.dso.toFixed(1)).toBe("86.9");
    expect((k.pctOver60 * 100).toFixed(1)).toBe("2.9");
    expect((k.pctOver90 * 100).toFixed(1)).toBe("1.0");
    expect((k.collectionEfficiency * 100).toFixed(1)).toBe("56.9");
    expect(Math.round(k.overdueExclDisputes)).toBe(25_341_948);
    expect((k.bouncedRate * 100).toFixed(1)).toBe("1.9");
    expect(Math.round(k.atRisk)).toBe(1_374_489);
    expect(Math.round(k.estimatedBadDebt)).toBe(914_140);
  });

  it("follow-up list: 27 rows, C014 85 then C005 80", () => {
    expect(r.followUp).toHaveLength(27);
    expect(r.followUp.slice(0, 2).map((x) => [x.client_code, x.score])).toEqual([["C014", 85], ["C005", 80]]);
    expect(r.followUp[1].reasonText).toBe("100 days overdue; broke a promise in the last 30 days; slowdown: paying 45 days late vs 16-day 12-month average");
    const c004 = r.followUp.find((x) => x.client_code === "C004");
    expect(c004?.openPromise?.date).toBe("2026-10-22");
    expect(c004?.openPromise?.amount).toBeGreaterThan(0);
  });

  it("flags: balance jump uses prev period; allowance shortfall", () => {
    const jump = r.flags.find((f) => f.flag === "Sudden balance jump");
    expect(jump?.who).toBe("C028");
    expect(Math.round(jump!.amount)).toBe(1_139_870);
    const short = r.flags.find((f) => f.flag === "Allowance shortfall");
    expect(Math.round(short!.amount)).toBe(264_140);
    expect(r.flags).toHaveLength(16);
    // without prev, the jump flag disappears and nothing else changes
    const noPrev = runEngine(getDemoSnapshot("P2"));
    expect(noPrev.flags.map((f) => f.flag)).toEqual(r.flags.filter((f) => f.flag !== "Sudden balance jump").map((f) => f.flag));
  });

  it("escalations include the over-limit-but-current credit-limit review", () => {
    expect(r.escalations).toHaveLength(9);
    expect(r.escalations.at(-1)).toMatchObject({ client_code: "C028", action: "Credit-limit review" });
    expect(r.escalations.find((e) => e.client_code === "C014")?.triggers).toEqual([
      "90+ days overdue", "2 broken promises (90 days)", "bounced check unreplaced > 7 days",
    ]);
  });

  it("PDC calendar: past-dated check flagged, 30 rows shown of 46", () => {
    expect(r.pdcs).toHaveLength(30);
    expect(r.pdcs[0]).toMatchObject({ client_code: "C031", check_date: "2026-09-25", week: 1 });
    expect(r.pdcs[0].flags).toEqual(["PAST CHECK DATE - deposit now", "client bounced a check in last 12 months"]);
    expect(r.pdcSummary.count).toBe(46);
    expect(r.bouncedOpen.map((b) => [b.client_code, b.daysAgo])).toEqual([["C014", 47], ["C023", 20]]);
    expect(r.onHold.map((h) => h.client_code)).toEqual(["C044"]);
  });
});
