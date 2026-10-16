// Server loader for the calendar: picks the books that describe a month and builds its events.
import { getResult } from "@/lib/data";
import { readTable } from "@/lib/demo-tables";
import { buildMonth, type MonthData } from "@/lib/calendar";
import { dataPeriodForMonth, type MonthKey } from "@/lib/session";

/**
 * Events for a month. Source books: the month's own month-end data when imported (Aug = P1, Sep = P2);
 * earlier months read the history in the 31 Aug books, later months the forward-dated rows in the latest books.
 */
export async function getMonthData(month: MonthKey): Promise<MonthData> {
  const period = dataPeriodForMonth(month);
  const [result, pdcRegister, aging, activity, bounced] = await Promise.all([
    getResult(period),
    readTable(period, "pdc_register"),
    readTable(period, "ar_aging"),
    readTable(period, "collection_activity"),
    readTable(period, "bounced_checks"),
  ]);
  return buildMonth(month, { period, result, pdcRegister, aging, activity, bounced });
}
