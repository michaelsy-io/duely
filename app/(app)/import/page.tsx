import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { addMonths, getMonthSelection, getSession, latestDataMonth, monthLabel, monthList, PERIODS, periodForMonth, ROLES } from "@/lib/session";
import { listImportsCached } from "@/lib/db/imports";
import { ImportWizard } from "./ImportWizard";
import { ImportedMonths } from "./ImportedMonths";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const [sel, session] = await Promise.all([getMonthSelection(), getSession()]);
  // Import is the Admin's month-end job; everyone else goes back to their home page.
  if (session.role !== "admin") redirect(ROLES[session.role].home);
  const imports = await listImportsCached().catch(() => []);

  // Any month in range except the bundled demo months (those can't be replaced).
  const months = monthList()
    .filter((m) => !periodForMonth(m))
    .map((m) => ({ value: m, imported: sel.imported.includes(m) }));
  // Target: the selected month when it can take an import, else the first month after the latest books.
  const next = addMonths(latestDataMonth(sel.imported), 1);
  const initialMonth = months.some((m) => m.value === sel.month) ? sel.month : months.find((m) => m.value === next)?.value ?? months[months.length - 1].value;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Import month-end files</h1>
        <p className="mt-2 text-fg-muted">Drop in your ERP exports. Duely recognises each file, matches columns and checks the totals, then the rules engine scores the month.</p>
      </div>
      <ImportWizard months={months} initialMonth={initialMonth} />
      <ImportedMonths
        bundled={[monthLabel(PERIODS.P1.month), monthLabel(PERIODS.P2.month)]}
        rows={imports.map((i) => ({ month: i.month, files: i.files.length, rows: i.rows, importedAt: i.imported_at, importedBy: i.imported_by, store: i.store }))}
      />
    </div>
  );
}
