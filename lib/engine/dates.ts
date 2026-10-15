// Date helpers on ISO strings. Day numbers are days since 1970-01-01 (UTC);
// nothing here reads the system clock.
import type { ISODate } from "./types";

export function dayNum(iso: ISODate): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function isoOf(day: number): ISODate {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/** pandas `cut - pd.offsets.MonthEnd(1)`: the last day of the previous month. */
export function prevMonthEnd(iso: ISODate): number {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, 0) / 86_400_000);
}
