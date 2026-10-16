import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/engine/csv";
import { getDemoResult } from "@/lib/engine/demo";
import { buildMonth, monthGrid } from "@/lib/calendar";
import { dataPeriodForMonth, parsePeriodValue, selectionFor, type Period } from "@/lib/session";

const FOLDER: Record<Period, string> = { P1: "P1_2026-08-31", P2: "P2_2026-09-30" };
const rows = (p: Period, name: string) =>
  parseCsv(fs.readFileSync(path.join(process.cwd(), "data/demo", FOLDER[p], `${name}.csv`), "utf8")).map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)])),
  );
const month = (m: string) => {
  const period = dataPeriodForMonth(m);
  return buildMonth(m, {
    period, result: getDemoResult(period),
    pdcRegister: rows(period, "pdc_register"), aging: rows(period, "ar_aging"),
    activity: rows(period, "collection_activity"), bounced: rows(period, "bounced_checks"),
  });
};

describe("month selection", () => {
  it("maps months to data periods", () => {
    expect(selectionFor("2026-08")).toMatchObject({ period: "P1", dataPeriod: "P1", today: "2026-08-31" });
    expect(selectionFor("2026-10")).toMatchObject({ period: null, dataPeriod: "P2", label: "October 2026" });
    expect(selectionFor("2026-06")).toMatchObject({ period: null, dataPeriod: "P1" });
  });
  it("accepts only P1/P2 or in-range month keys", () => {
    expect(parsePeriodValue("P2")).toBe("P2");
    expect(parsePeriodValue("2026-09")).toBe("P2");
    expect(parsePeriodValue("2026-11")).toBe("2026-11");
    expect(parsePeriodValue("2027-01")).toBeNull();
    expect(parsePeriodValue("junk")).toBeNull();
  });
});

describe("calendar", () => {
  it("builds a Monday-first grid", () => {
    const g = monthGrid("2026-09"); // 1 Sep 2026 is a Tuesday
    expect(g.length % 7).toBe(0);
    expect(g[0]).toEqual({ iso: "2026-08-31", inMonth: false });
    expect(g[1]).toEqual({ iso: "2026-09-01", inMonth: true });
    expect(g.filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("puts the close, reviews and the bounced check in September (P2)", () => {
    const m = month("2026-09");
    expect(m.hasData).toBe(true);
    const close = m.days["2026-09-30"].filter((e) => e.kind === "close");
    expect(close).toHaveLength(1);
    expect(close[0].amount).toBe(getDemoResult("P2").kpis.totalAr);
    expect(m.summary.reviews).toBe(getDemoResult("P2").escalations.length);
    expect(m.days["2026-09-10"].some((e) => e.kind === "bounced" && e.client_code === "C023")).toBe(true);
    expect(m.summary.promises.missed).toBeGreaterThan(0);
  });

  it("shows forward-dated checks in October without month-end data", () => {
    const m = month("2026-10");
    expect(m.hasData).toBe(false);
    expect(m.summary.checks.count).toBe(45);
    expect(Object.values(m.days).flat().some((e) => e.kind === "close")).toBe(false);
  });

  it("reads older months from the 31 Aug books without a close", () => {
    const m = month("2026-06");
    expect(m.hasData).toBe(false);
    expect(m.source.period).toBe("P1");
    expect(m.summary.reviews).toBe(0);
    // Only invoices still open at 31 Aug can appear, each as late.
    expect(m.summary.invoices.overdue).toBe(m.summary.invoices.count);
  });
});
