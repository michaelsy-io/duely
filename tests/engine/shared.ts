// Assertions shared by the P1 and P2 suites: every table in the answer key, value by value.
import { describe, it, expect } from "vitest";
import { getDemoResult } from "../../lib/engine/demo";
import { renderReport } from "../../lib/engine/report";
import { peso, pct, fixed } from "../../lib/engine/format";
import { BUCKETS } from "../../lib/engine/rules";
import { readExpected, table, line } from "./helpers";

export function answerKeySuite(period: "P1" | "P2") {
  const md = readExpected(period);
  const r = getDemoResult(period);

  describe(`${period} answer key tables`, () => {
    it("KPI table, every row", () => {
      const k = r.kpis;
      const got = [
        `${fixed(k.dso, 1)} days`, pct(k.pctOver60), pct(k.pctOver90), pct(k.collectionEfficiency),
        `${peso(k.totalAr)} / ${peso(k.ledgerAr)}`, peso(k.overdueExclDisputes), pct(k.bouncedRate), peso(k.atRisk),
        pct(k.top10ShareAr), pct(k.top10ShareOverdue), peso(k.estimatedBadDebt), peso(k.allowance),
        k.writeOffPctByYear.map((y) => pct(y.pct, 2)).join(" / "),
      ];
      expect(got).toEqual(table(md, "KPI table").map((row) => row[1]));
    });

    it("loss rates and aging buckets", () => {
      expect(BUCKETS.map((b) => `${b} ${pct(r.kpis.lossRates[b], 2)}`).join(", ")).toBe(line(md, "Loss rates used: "));
      expect(BUCKETS.map((b) => `${b} ${peso(r.kpis.buckets[b])}`).join(", ")).toBe(line(md, "Aging buckets: "));
    });

    it("4-week inflow table", () => {
      expect(r.inflow.map((w) => [w.label, peso(w.pdcs), peso(w.promises), peso(w.currentInvoices), peso(w.total)])).toEqual(
        table(md, "Expected inflow"),
      );
    });

    it("AR by rep table", () => {
      expect(
        r.reps.map((x) => [x.rep, peso(x.totalAr), peso(x.overdue), pct(x.pctOver60), fixed(x.dso, 0), pct(x.discountRate), pct(x.creditMemoRate, 2), peso(x.salesTo60Plus)]),
      ).toEqual(table(md, "AR by rep"));
    });

    it("exceptions and bad-debt flags table", () => {
      expect(r.flags.map((f) => [f.flag, f.who, peso(f.amount), f.rule, f.source, f.owner])).toEqual(table(md, "Exceptions and bad-debt flags"));
    });

    it("full follow-up list: rank, client, segment, collector, overdue, oldest, score, reason, open promise", () => {
      const exp = table(md, "Collections: prioritized follow-up list");
      expect(r.followUp).toHaveLength(exp.length);
      r.followUp.forEach((x, i) => {
        expect([String(x.rank), x.client_code, x.segment, x.collector, peso(x.overdue), String(x.oldestDays), String(x.score), x.reasonText,
          x.openPromise ? `open promise ${x.openPromise.date}` : ""]).toEqual(exp[i]);
        expect(x.reasons.join("; ")).toBe(x.reasonText);
        expect(x.factors.reduce((a, f) => a + f.points, 0)).toBe(x.score);
      });
    });

    it("on-hold list", () => {
      expect(r.onHold.map((h) => `${h.client_code} ${h.inv_no} ${peso(h.amount)} (${h.reason})`).join(", ") || "none").toBe(
        line(md, "On hold (open disputes / pending returns, not chased): "),
      );
    });

    it("PDC calendar and summary", () => {
      expect(r.pdcs.map((p) => [p.check_date, p.client_code, peso(p.amount), p.flags.join("; ")])).toEqual(table(md, "PDC calendar"));
      expect(`(Showing checks dated up to ${r.pdcSummary.horizon} plus any flagged; ${r.pdcSummary.count} checks on hand in total, ${peso(r.pdcSummary.total)}.)`).toBe(
        "(Showing checks" + line(md, "(Showing checks"),
      );
    });

    it("bounced checks awaiting replacement", () => {
      expect(r.bouncedOpen.map((b) => `${b.client_code} ${peso(b.amount)} returned ${b.date_returned} (${b.daysAgo} days ago)`).join(", ") || "none").toBe(
        line(md, "Bounced and awaiting replacement: "),
      );
    });

    it("escalation list", () => {
      expect(r.escalations.map((e) => [e.client_code, e.triggerText, e.recommendedAction, e.approver])).toEqual(table(md, "Escalation list"));
      for (const e of r.escalations) expect(e.triggers.join("; ")).toBe(e.triggerText);
    });

    it("whole rendered report matches the answer key byte for byte", () => {
      expect(renderReport(r) + "\n").toBe(md);
    });
  });
}
