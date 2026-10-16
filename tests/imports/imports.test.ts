import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { guessTable, prepareImport, REQUIRED_TABLES, toIsoDate, type IncomingFile } from "@/lib/imports/files";
import { getDemoResult } from "@/lib/engine/demo";
import { SNAPSHOT_FILES } from "@/lib/engine/csv";
import { dataPeriodForMonth, latestDataMonth, parsePeriodValue, periodForMonth, periodInfo, PERIODS, previousPeriod, selectionFor } from "@/lib/session";
import { deleteImport, listImports, saveImport } from "@/lib/db/imports";
import { forgetImport, importResult, preloadImports, previewImportResult } from "@/lib/imports/load";
import { getResult } from "@/lib/data";
import { readTable } from "@/lib/demo-tables";
import { engine, normalizePeriod, readDemoCsv } from "@/lib/ai/context";

const dir = (folder: string) => path.join(process.cwd(), "data", "demo", folder);
const bundled = (folder: string): IncomingFile[] =>
  SNAPSHOT_FILES.map((f) => ({ name: f, text: fs.readFileSync(path.join(dir(folder), f), "utf8") }));

describe("file recognition and validation", () => {
  it("recognises all 13 bundled files by name and headers", () => {
    for (const f of bundled("P2_2026-09-30")) {
      const headers = f.text.split(/\r?\n/)[0].split(",");
      expect(guessTable(f.name, headers)).toBe(f.name.replace(/\.csv$/, ""));
    }
  });

  it("accepts a complete month and leaves canonical files untouched", () => {
    const files = bundled("P2_2026-09-30");
    const check = prepareImport("2026-09", files);
    expect(check.errors).toEqual([]);
    expect(check.ok).toBe(true);
    expect(check.asOf).toBe("2026-09-30");
    expect(check.files).toHaveLength(13);
    for (const f of check.files) expect(f.text).toBe(files.find((x) => x.name === f.file)!.text.replace(/^﻿/, ""));
  });

  it("rejects books for another month (ledger control date)", () => {
    const check = prepareImport("2026-10", bundled("P2_2026-09-30"));
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toMatch(/closes on 30 Sep 2026, not 31 Oct 2026/);
  });

  it("lists missing required files", () => {
    const check = prepareImport("2026-09", bundled("P2_2026-09-30").filter((f) => f.name !== "ar_aging.csv" && f.name !== "writeoff_history.csv"));
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toMatch(/Still missing: AR aging\./);
    expect(REQUIRED_TABLES).not.toContain("writeoff_history"); // optional: the engine does not read it
  });

  it("renames synonym headers and converts day-first dates", () => {
    const files = bundled("P2_2026-09-30").filter((f) => f.name !== "ar_aging.csv");
    files.push({
      name: "ar_aging.csv",
      text: "Customer Code,Invoice No,inv date,Date Due,Open Amount,Days Past Due,bucket\nC001,INV-1,03/09/2026,02/10/2026,100.5,0,Current\n",
    });
    expect(prepareImport("2026-09", files).errors.join(" ")).toMatch(/day or the month comes first/);
    const check = prepareImport("2026-09", files, { dateFormat: "dmy" });
    expect(check.ok).toBe(true);
    const aging = check.files.find((f) => f.table === "ar_aging")!;
    expect(aging.renamed).toMatchObject({ "Customer Code": "client_code", "Invoice No": "inv_no", "Open Amount": "balance" });
    expect(aging.text.split(/\r?\n/)[0]).toBe("client_code,inv_no,invoice_date,due_date,balance,days_overdue,bucket");
    expect(aging.text).toContain("C001,INV-1,2026-09-03,2026-10-02,100.5,0,Current");
  });

  it("converts dates both ways", () => {
    expect(toIsoDate("03/10/2026", "dmy")).toBe("2026-10-03");
    expect(toIsoDate("03/10/2026", "mdy")).toBe("2026-03-10");
    expect(toIsoDate("2026-10-03", "dmy")).toBe("2026-10-03");
  });

  it("an imported copy of the September books gives the same engine result as the bundled P2", () => {
    const check = prepareImport("2026-09", bundled("P2_2026-09-30"));
    const res = previewImportResult("2026-09", Object.fromEntries(check.files.map((f) => [f.file, f.text])));
    expect(res).toEqual(getDemoResult("P2"));
  });
});

describe("period model with imported months", () => {
  it("keeps bundled behaviour when nothing is imported", () => {
    expect(selectionFor("2026-10")).toMatchObject({ period: null, dataPeriod: "P2", today: "2026-09-30" });
    expect(latestDataMonth()).toBe("2026-09");
    expect(parsePeriodValue("2026-10")).toBe("2026-10");
  });

  it("treats an imported month as a data period as of its month end", () => {
    const imported = ["2026-10"];
    expect(periodForMonth("2026-10", imported)).toBe("2026-10");
    expect(selectionFor("2026-10", imported)).toMatchObject({ period: "2026-10", dataPeriod: "2026-10", today: "2026-10-31", label: "October 2026" });
    expect(selectionFor("2026-11", imported)).toMatchObject({ period: null, dataPeriod: "2026-10" });
    expect(dataPeriodForMonth("2026-09", imported)).toBe("P2");
    expect(latestDataMonth(imported)).toBe("2026-10");
    expect(previousPeriod("2026-10", imported)).toBe("P2");
    expect(previousPeriod("P2", imported)).toBe("P1");
    expect(PERIODS["2026-10"]).toEqual({ asOf: "2026-10-31", label: "31 Oct 2026", short: "31 Oct", folder: null, month: "2026-10" });
    expect(periodInfo("P1").label).toBe("31 Aug 2026");
    expect(Object.keys(PERIODS)).toEqual(["P1", "P2"]);
  });
});

describe("in-memory import store (no Supabase)", () => {
  // Store the September files under October: enough to test the wiring (as-of date, tables, revert).
  const files = bundled("P2_2026-09-30").map((f) => ({ file: f.name, content: f.text, rows: 1 }));
  afterAll(async () => {
    await deleteImport("2026-10");
    forgetImport("2026-10");
  });

  it("saves, serves and reverts a month", async () => {
    expect(await saveImport("2026-10", files, "Admin")).toBe("memory");
    const list = await listImports();
    expect(list.map((m) => m.month)).toEqual(["2026-10"]);
    expect(list[0]).toMatchObject({ store: "memory", imported_by: "Admin", rows: 13 });

    const r = await getResult("2026-10");
    expect(r.asOf).toBe("2026-10-31");
    expect(importResult("2026-10")?.asOf).toBe("2026-10-31");
    expect((await readTable("2026-10", "ar_aging")).length).toBe((await readTable("P2", "ar_aging")).length);
    // chat / MCP helpers see the loaded month
    expect(normalizePeriod("2026-10")).toBe("2026-10");
    expect(engine("2026-10").asOf).toBe("2026-10-31");
    expect(readDemoCsv("2026-10", "customers").length).toBe(readDemoCsv("P2", "customers").length);

    expect(await deleteImport("2026-10")).toBe(true);
    await preloadImports(await listImports());
    expect(importResult("2026-10")).toBeNull();
    expect(normalizePeriod("2026-10")).toBeNull();
    expect(await listImports()).toEqual([]);
  });
});
