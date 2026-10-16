"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { monthLabel, type MonthKey } from "@/lib/months";

export interface ImportedMonthRow {
  month: MonthKey;
  files: number;
  rows: number;
  importedAt: string;
  importedBy: string | null;
  store: "db" | "memory";
}

function when(iso: string): string {
  const d = new Date(iso);
  // Fixed time zone (the company's), so server and browser render the same text.
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" });
}

/** Imported months with a Revert button each (Admin only; the page checks the role). */
export function ImportedMonths({ rows, bundled }: { rows: ImportedMonthRow[]; bundled: string[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<MonthKey | null>(null);
  const [busy, setBusy] = useState<MonthKey | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  async function revert(m: MonthKey) {
    setBusy(m);
    setMsg(null);
    try {
      const res = await fetch(`/api/import?month=${m}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ tone: "bad", text: data.error ?? `Could not revert ${monthLabel(m)}.` });
      else setMsg({ tone: "good", text: `${monthLabel(m)} reverted. The month is empty again.` });
      router.refresh();
    } catch {
      setMsg({ tone: "bad", text: "Could not reach Duely. Try again." });
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="imported-title">
      <h2 id="imported-title" className="font-display text-xl font-extrabold tracking-tight">Imported months</h2>
      <p className="mt-1 text-sm text-fg-muted">Revert a month to take its files out again. {bundled.join(" and ")} are bundled demo books and can&apos;t be reverted.</p>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-fg-muted">No months imported yet.</p>
      ) : (
        <ul className="list-group mt-3">
          {rows.map((r) => (
            <li key={r.month} className="pad-y flex flex-col gap-3 px-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{monthLabel(r.month)}</p>
                <p className="text-[13px] text-fg-muted">
                  <span className="num">{r.files}</span> files · <span className="num">{r.rows.toLocaleString()}</span> rows · imported {when(r.importedAt)}{r.importedBy ? ` by ${r.importedBy}` : ""}
                  {r.store === "memory" && " · this server only"}
                </p>
              </div>
              {confirming === r.month ? (
                <div role="group" aria-label={`Confirm revert of ${monthLabel(r.month)}`} className="flex flex-col gap-2 rounded-2xl bg-bad-soft p-3 text-sm sm:max-w-sm">
                  <p className="text-bad-fg">Revert {monthLabel(r.month)}? The month goes back to empty. Bundled demo months can&apos;t be reverted.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy === r.month} onClick={() => void revert(r.month)}>
                      {busy === r.month ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}Yes, revert
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.month} onClick={() => setConfirming(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm self-start sm:self-auto" onClick={() => { setConfirming(r.month); setMsg(null); }}>
                  <RotateCcw className="size-4" aria-hidden="true" />Revert
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p role="status" className={msg.tone === "good" ? "mt-3 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good-fg" : "mt-3 rounded-2xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad-fg"}>{msg.text}</p>}
    </section>
  );
}
