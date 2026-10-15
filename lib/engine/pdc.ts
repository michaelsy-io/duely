// PDC calendar (checks on hand) and bounced checks awaiting replacement.
import type { BouncedOpen, PdcRow } from "./types";
import { PDC, INFLOW } from "./rules";
import type { Model } from "./model";
import { sum, sortByDate } from "./model";
import type { Base } from "./aging";
import { isoOf } from "./dates";

export interface PdcRowPlus extends PdcRow {
  /** True when the reference calendar shows this check (dated within 14 days, or flagged). */
  inCalendar: boolean;
  bank?: string;
  invoices_covered: string | null;
}

export interface PdcSummary { count: number; total: number; horizon: string; }

export function computePdcs(m: Model, b: Base): { all: PdcRowPlus[]; calendar: PdcRowPlus[]; summary: PdcSummary } {
  const { cut } = m;
  const bouncers = new Set(m.bnc.map((x) => x.client_code));
  const all = sortByDate(b.onhand, (p) => p.check_date)
    .map((p) => {
      const flags: string[] = [];
      const cd = p.check_date;
      if (cd !== null && cd <= cut) flags.push("PAST CHECK DATE - deposit now");
      if (cd !== null && cut - cd > PDC.nearingStaleDays) flags.push("nearing stale");
      if (bouncers.has(p.client_code)) flags.push("client bounced a check in last 12 months");
      let week = 0;
      if (cd !== null) {
        for (let i = 0; i < INFLOW.weeks; i++) {
          const a = cut + 7 * i + 1, e = cut + 7 * (i + 1);
          if (cd <= e && (cd >= a || i === 0)) { week = i + 1; break; }
        }
      }
      return {
        client_code: p.client_code,
        check_no: p.check_no,
        amount: p.amount,
        check_date: cd === null ? "" : isoOf(cd),
        week,
        flags,
        inCalendar: (cd !== null && cd <= cut + PDC.calendarHorizonDays) || flags.length > 0,
        invoices_covered: p.invoices_covered,
      };
    });
  return {
    all,
    calendar: all.filter((r) => r.inCalendar),
    summary: { count: b.onhand.length, total: sum(b.onhand.map((p) => p.amount)), horizon: isoOf(cut + PDC.calendarHorizonDays) },
  };
}

export function computeBouncedOpen(m: Model, b: Base): (BouncedOpen & { check_no: string })[] {
  return b.bouncedOpen.map((x) => ({
    client_code: x.client_code,
    check_no: x.check_no,
    amount: x.amount,
    date_returned: x.date_returned === null ? "" : isoOf(x.date_returned),
    daysAgo: x.date_returned === null ? NaN : m.cut - x.date_returned,
  }));
}
