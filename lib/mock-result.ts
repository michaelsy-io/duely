// TEMPORARY stand-in for the rules engine, used only until lib/engine/demo lands
// (lib/data.ts falls back to this when the engine import fails).
// Hand-typed P1 (as of 2026-08-31) figures supplied by the lead for UI work.
import type { EngineResult, FollowUpRow, PdcRow, ISODate } from "@/lib/engine/types";

type Seed = [code: string, segment: string, collector: string, overdue: number, days: number, score: number, reasons: string, pdcCover?: number, balance?: number, limit?: number];

const SEEDS: Seed[] = [
  ["C014", "Eye clinic", "Collector 2", 601661, 65, 75, "65 days overdue; broke a promise in the last 30 days; bounced check in last 12 months (not replaced); over credit limit (₱889,771 vs ₱450,000)", 0, 889771, 450000],
  ["C002", "Hospital", "Collector 1", 4469391, 36, 65, "36 days overdue; broke a promise in the last 30 days; no contact in 14+ days", 0, 9120400, 16200000],
  ["C036", "Optical shop", "Collector 3", 777950, 99, 65, "99 days overdue; over credit limit (₱777,950 vs ₱450,000); slowdown: paying 94 days late vs 24-day 12-month average", 0, 777950, 450000],
  ["C005", "Hospital", "Collector 3", 4789434, 70, 60, "70 days overdue; no contact in 14+ days"],
  ["C048", "Hospital", "Collector 2", 1071287, 14, 55, "14 days overdue; broke a promise in the last 30 days; no contact in 14+ days"],
  ["C040", "Optical shop", "Collector 3", 66251, 377, 50, "377 days overdue; no contact in 14+ days"],
  ["C020", "Hospital", "Collector 2", 1317250, 16, 40, "16 days overdue; no contact in 14+ days", 654662],
  ["C008", "Hospital", "Collector 1", 306770, 3, 35, "3 days overdue; broke a promise in the last 30 days; no contact in 14+ days"],
  ["C003", "Hospital", "Collector 2", 1703544, 27, 30, "27 days overdue"],
  ["C004", "Hospital", "Collector 1", 742046, 20, 30, "20 days overdue; no contact in 14+ days"],
  ["C026", "Hospital", "Collector 2", 517170, 9, 30, "9 days overdue; no contact in 14+ days"],
  ["C009", "Eye clinic", "Collector 1", 282111, 25, 20, "25 days overdue; no contact in 14+ days"],
  ["C012", "Hospital", "Collector 1", 264130, 2, 20, "2 days overdue; no contact in 14+ days"],
  ["C038", "Hospital", "Collector 3", 249250, 1, 20, "1 days overdue; no contact in 14+ days"],
  ["C030", "Hospital", "Collector 3", 249038, 8, 20, "8 days overdue; no contact in 14+ days"],
  ["C011", "Eye clinic", "Collector 3", 240160, 21, 20, "21 days overdue; no contact in 14+ days"],
  ["C010", "Eye clinic", "Collector 3", 234191, 8, 20, "8 days overdue; no contact in 14+ days"],
  ["C025", "Optical shop", "Collector 2", 119950, 9, 20, "9 days overdue; no contact in 14+ days"],
  ["C033", "Optical shop", "Collector 3", 516748, 1, 10, "1 days overdue; over credit limit (₱783,954 vs ₱700,000); no contact in 14+ days; PDCs on hand ₱652,548 cover the overdue amount", 652548, 783954, 700000],
  ["C034", "Hospital", "Collector 1", 661695, 9, 0, "9 days overdue; no contact in 14+ days; PDCs on hand ₱661,695 cover the overdue amount", 661695],
  ["C017", "Eye clinic", "Collector 1", 569070, 1, 0, "1 days overdue; no contact in 14+ days; PDCs on hand ₱1,524,180 cover the overdue amount", 1524180],
  ["C007", "Optical shop", "Collector 1", 151770, 39, 0, "39 days overdue; no contact in 14+ days; PDCs on hand ₱291,450 cover the overdue amount", 291450],
  ["C042", "Eye clinic", "Collector 3", 337880, 4, -10, "4 days overdue; no contact in 14+ days; PDCs on hand ₱508,406 cover the overdue amount", 508406],
  ["C023", "Optical shop", "Collector 2", 289060, 3, -10, "3 days overdue; no contact in 14+ days; PDCs on hand ₱289,060 cover the overdue amount", 289060],
];

function factorPoints(reason: string, days: number): { label: string; points: number } | null {
  if (/days overdue/.test(reason)) return { label: reason, points: days > 90 ? 40 : days > 60 ? 30 : days > 30 ? 20 : 10 };
  if (/broke a promise/.test(reason)) return { label: reason, points: 15 };
  if (/bounced check/.test(reason)) return { label: reason, points: 10 };
  if (/over credit limit/.test(reason)) return { label: reason, points: 10 };
  if (/no contact/.test(reason)) return { label: reason, points: 10 };
  if (/slowdown/.test(reason)) return { label: reason, points: 5 };
  if (/PDCs on hand/.test(reason)) return { label: reason, points: -30 };
  return null;
}

function row(s: Seed, i: number): FollowUpRow {
  const [code, segment, collector, overdue, days, score, reasonText, pdcCover = 0, balance, limit] = s;
  const reasons = reasonText.split("; ");
  const factors = reasons.map((r) => factorPoints(r, days)).filter(Boolean) as { label: string; points: number }[];
  const rest = score - factors.reduce((a, f) => a + f.points, 0);
  if (rest !== 0) factors.splice(1, 0, { label: rest >= 20 ? "Overdue amount in the top 20%" : "Overdue amount in the next 30%", points: rest });
  return {
    rank: i + 1,
    client_code: code,
    segment,
    collector,
    overdue,
    oldestDays: days,
    score,
    reasons,
    reasonText,
    factors,
    openPromise: null,
    pdcCover,
    totalBalance: balance ?? Math.round(overdue * 1.6),
    creditLimit: limit ?? Math.round(overdue * 3.2 / 50000) * 50000,
  };
}

const PDC_SEED: [string, string, number, ISODate][] = [
  ["C056", "****1201", 334830, "2026-09-01"], ["C017", "****1202", 569070, "2026-09-02"], ["C055", "****1203", 113602, "2026-09-02"],
  ["C034", "****1204", 264374, "2026-09-03"], ["C020", "****1205", 254450, "2026-09-04"], ["C058", "****1206", 169323, "2026-09-04"],
  ["C054", "****1207", 210690, "2026-09-05"], ["C032", "****1208", 202992, "2026-09-06"], ["C052", "****1209", 259475, "2026-09-06"],
  ["C007", "****1210", 151770, "2026-09-07"], ["C016", "****1211", 126320, "2026-09-07"], ["C017", "****1212", 122870, "2026-09-07"],
  ["C017", "****1213", 384360, "2026-09-07"], ["C054", "****1214", 255104, "2026-09-07"], ["C020", "****1215", 400212, "2026-09-08"],
  ["C023", "****1216", 289060, "2026-09-08"], ["C049", "****1217", 106070, "2026-09-09"], ["C006", "****1218", 209549, "2026-09-10"],
  ["C033", "****1219", 516748, "2026-09-11"], ["C015", "****1220", 419059, "2026-09-12"], ["C024", "****1221", 151488, "2026-09-12"],
  ["C034", "****1222", 397322, "2026-09-12"], ["C059", "****1223", 169710, "2026-09-12"], ["C017", "****1224", 211960, "2026-09-13"],
  ["C042", "****1225", 337880, "2026-09-13"], ["C003", "****1226", 312400, "2026-09-16"], ["C001", "****1227", 348957, "2026-09-18"],
  ["C045", "****1228", 210300, "2026-09-19"], ["C043", "****1229", 188900, "2026-09-23"], ["C051", "****1230", 231044, "2026-09-25"],
];

function pdcs(): PdcRow[] {
  return PDC_SEED.map(([client_code, check_no, amount, check_date]) => {
    const day = Number(check_date.slice(8));
    const week = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 0;
    return { client_code, check_no, amount, check_date, week, flags: [] };
  });
}

export function buildMockResult(period: "P1" | "P2"): EngineResult {
  const asOf = period === "P1" ? "2026-08-31" : "2026-09-30";
  return {
    asOf,
    control: { agingTotal: 102764253, ledgerAr: 102714253, gap: 50000, unappliedTotal: 50000, unappliedRefs: ["OR-51760 (C012)"], missingClients: [] },
    kpis: {
      dso: 84.4,
      pctOver60: 0.011,
      pctOver90: 0.003,
      collectionEfficiency: 0.621,
      totalAr: 102764253,
      ledgerAr: 102714253,
      overdueExclDisputes: 20577809,
      bouncedRate: 0.009,
      atRisk: 431617,
      top10ShareAr: 0.598,
      top10ShareOverdue: 0.812,
      estimatedBadDebt: 623573,
      allowance: 650000,
      lossRates: { Current: 0.0033, "1-30": 0.0074, "31-60": 0.0236, "61-90": 0.0688, "90+": 0.2784 },
      buckets: { Current: 82102636, "1-30": 15327095, "31-60": 4249093, "61-90": 798852, "90+": 286577 },
    },
    inflow: [
      { label: "Week 1", start: "2026-09-01", end: "2026-09-07", pdcs: 3419229, promises: 0, currentInvoices: 4711562, total: 8130791 },
      { label: "Week 2", start: "2026-09-08", end: "2026-09-14", pdcs: 3209059, promises: 0, currentInvoices: 5294062, total: 8503121 },
      { label: "Week 3", start: "2026-09-15", end: "2026-09-21", pdcs: 1084346, promises: 70848, currentInvoices: 5120963, total: 6276157 },
      { label: "Week 4", start: "2026-09-22", end: "2026-09-28", pdcs: 476125, promises: 0, currentInvoices: 3259532, total: 3735656 },
    ],
    reps: [
      { rep: "Rep A", totalAr: 7339634, overdue: 2218368, pctOver60: 0.08, dso: 60, discountRate: 0.022, creditMemoRate: 0.001, salesTo60Plus: 288110 },
      { rep: "Rep B", totalAr: 21830448, overdue: 3509818, pctOver60: 0.003, dso: 85, discountRate: 0.021, creditMemoRate: 0.0018, salesTo60Plus: 0 },
      { rep: "Rep C", totalAr: 41595005, overdue: 11410241, pctOver60: 0.01, dso: 112, discountRate: 0.026, creditMemoRate: 0.0014, salesTo60Plus: 1616244 },
      { rep: "Rep D", totalAr: 21423914, overdue: 3523190, pctOver60: 0, dso: 79, discountRate: 0.014, creditMemoRate: 0.001, salesTo60Plus: 0 },
      { rep: "Rep E", totalAr: 10575252, overdue: 0, pctOver60: 0, dso: 54, discountRate: 0.017, creditMemoRate: 0, salesTo60Plus: 0 },
    ],
    flags: [
      { flag: "Unapproved credit memo", who: "C009 / Rep D", amount: 27500, rule: "No approver recorded", source: "CM-422", owner: "Finance head" },
      { flag: "Unapplied payment", who: "C012", amount: 50000, rule: "Not matched to an invoice for 21 days", source: "OR-51760", owner: "Accounting" },
      { flag: "Inflow drop", who: "Week 4", amount: 3735656, rule: "56% of 4-week average", source: "expected inflow table", owner: "Top management" },
      { flag: "Concentration", who: "C005", amount: 4789434, rule: "23% of total overdue", source: "ar_aging.csv", owner: "Top management" },
      { flag: "Concentration", who: "C002", amount: 4469391, rule: "22% of total overdue", source: "ar_aging.csv", owner: "Top management" },
      { flag: "Write-off candidate", who: "C040", amount: 66251, rule: "377 days overdue; demand letter already sent", source: "ar_aging.csv", owner: "Top management with accountant" },
    ],
    followUp: SEEDS.map(row),
    onHold: [{ client_code: "C019", reason: "Pricing - billed list price instead of contract price (INV-11932)", amount: 86400 }],
    pdcs: pdcs(),
    bouncedOpen: [{ client_code: "C014", amount: 145040, date_returned: "2026-08-14", daysAgo: 17 }],
    escalations: [
      { client_code: "C014", action: "Credit hold", triggers: ["bounced check unreplaced > 7 days"] },
      { client_code: "C002", action: "Credit hold", triggers: ["2 broken promises (90 days)"] },
      { client_code: "C036", action: "Credit hold", triggers: ["90+ days overdue"] },
      { client_code: "C005", action: "Visit", triggers: ["61-90 days"] },
      { client_code: "C048", action: "Credit hold", triggers: ["2 broken promises (90 days)"] },
      { client_code: "C040", action: "Credit hold", triggers: ["90+ days overdue"] },
      { client_code: "C008", action: "Visit", triggers: ["one broken promise"] },
    ],
    writeOffCandidates: [{ client_code: "C040", amount: 66251, reasons: ["377 days overdue", "demand letter already sent"] }],
  };
}
