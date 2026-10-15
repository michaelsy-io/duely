import type { Metadata } from "next";
import { getPeriodFromCookie } from "@/lib/data";
import { PERIODS } from "@/lib/session";
import { ImportWizard } from "./ImportWizard";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const period = await getPeriodFromCookie();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Import month-end files</h1>
        <p className="mt-2 text-fg-muted">Drop in your ERP exports. Duely recognises each file, matches columns and checks the totals before anything is scored.</p>
      </div>
      <ImportWizard periodLabel={PERIODS[period].label} />
    </div>
  );
}
