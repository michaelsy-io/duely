import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMonthSelection, getSession, PERIODS } from "@/lib/session";
import { ImportWizard } from "./ImportWizard";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const [sel, session] = await Promise.all([getMonthSelection(), getSession()]);
  // Collecting agents do not import files; send them to their list.
  if (session.role === "collector") redirect("/today");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Import month-end files</h1>
        <p className="mt-2 text-fg-muted">Drop in your ERP exports. Duely recognises each file, matches columns and checks the totals before anything is scored.</p>
        {!sel.period && <p className="mt-3 inline-flex rounded-pill bg-primary-soft px-3 py-1 text-sm font-bold text-primary-soft-fg">Importing for {sel.label}: no month-end data yet</p>}
      </div>
      <ImportWizard periodLabel={PERIODS[sel.dataPeriod].label} />
    </div>
  );
}
