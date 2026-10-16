import { renderReport } from "@/lib/engine/report";
import { getResult, getPeriodFromCookie } from "@/lib/data";
import { isPeriod, periodForMonth } from "@/lib/session";
import { importedMonthKeys } from "@/lib/db/imports";

/** Month report (markdown) for the current or ?period= demo period. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("period");
  const period = (p && periodForMonth(p, await importedMonthKeys())) || (isPeriod(p) ? p : await getPeriodFromCookie());
  const result = await getResult(period);
  return new Response(renderReport(result), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="duely-month-report-${result.asOf}.md"`,
    },
  });
}
