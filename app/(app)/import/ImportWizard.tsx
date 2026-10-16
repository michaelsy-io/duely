"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import Papa from "papaparse";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, FileSpreadsheet, HelpCircle, Loader2, Play, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ambiguousDate, guessTable, matchColumn, REQUIRED_TABLES, TABLES, type DateFormat } from "@/lib/imports/files";
import { monthLabel, type MonthKey } from "@/lib/months";
import { peso } from "@/lib/format";

interface FileInfo {
  name: string; size: number; table: string | null; headers: string[]; rows: Record<string, string>[]; rowCount: number; dateSample: string | null; error?: string;
  /** CSV text sent to the server (Excel sheets are converted to CSV in the browser). */
  text: string;
}

async function readFile(f: File): Promise<FileInfo> {
  try {
    let text: string;
    if (/\.xlsx?$/i.test(f.name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { blankrows: false });
    } else {
      text = await f.text();
    }
    const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
    const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
    return { name: f.name, size: f.size, headers, rows: parsed.data.slice(0, 5), rowCount: parsed.data.length, table: guessTable(f.name, headers), dateSample: ambiguousDate(parsed.data.slice(0, 50), headers), text };
  } catch (e) {
    return { name: f.name, size: f.size, headers: [], rows: [], rowCount: 0, table: null, dateSample: null, error: (e as Error).message, text: "" };
  }
}

interface ImportResult {
  month: MonthKey; label: string; asOf: string; store: "db" | "memory";
  files: { file: string; rows: number }[]; openInvoices: number; clientsToFollowUp: number; totalAr: number;
  control: { agingTotal: number; ledgerAr: number; gap: number; unappliedRefs: string[] };
  warnings: string[];
}

type RunState =
  | { kind: "idle" }
  | { kind: "sending"; count: number }
  | { kind: "done"; result: ImportResult }
  | { kind: "error"; message: string; errors: string[] };

const STEPS = ["Upload", "Recognise", "Match columns", "Check dates", "Run the month"];

export function ImportWizard({ months, initialMonth }: {
  /** Months the Admin can import into: value + whether it already has imported files. */
  months: { value: MonthKey; imported: boolean }[];
  initialMonth: MonthKey;
}) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState(0);
  const [dateFmt, setDateFmt] = useState<"" | DateFormat>("");
  const [month, setMonth] = useState<MonthKey>(initialMonth);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const add = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => /\.(csv|xlsx|xls)$/i.test(f.name));
    const infos = await Promise.all(arr.map(readFile));
    setFiles((prev) => [...prev.filter((p) => !infos.some((i) => i.name === p.name)), ...infos]);
    setRun({ kind: "idle" });
  }, []);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    void add(e.dataTransfer.files);
  }

  const recognised = files.filter((f) => f.table);
  const missing = REQUIRED_TABLES.filter((t) => !files.some((f) => f.table === t));
  const current = files[sel];
  const ambiguous = files.find((f) => f.dateSample);
  const columnGaps = recognised.filter((f) => TABLES[f.table!].columns.some((c) => !matchColumn(c, f.headers).header));
  const ready = files.length > 0 && missing.length === 0 && columnGaps.length === 0 && (!ambiguous || !!dateFmt);
  const step = run.kind === "done" ? 5 : files.length === 0 ? 0 : missing.length || columnGaps.length ? 2 : ambiguous && !dateFmt ? 3 : 4;
  const target = months.find((m) => m.value === month);

  const mapping = useMemo(() => {
    if (!current?.table) return [];
    return TABLES[current.table].columns.map((c) => ({ target: c, ...matchColumn(c, current.headers) }));
  }, [current]);

  const recon = useMemo(() => ({ aging: files.find((f) => f.table === "ar_aging"), gl: files.find((f) => f.table === "gl_extract") }), [files]);

  async function runMonth() {
    const toSend = files.filter((f) => f.table && !f.error);
    setRun({ kind: "sending", count: toSend.length });
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, dateFormat: dateFmt || null, files: toSend.map((f) => ({ name: f.name, text: f.text })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRun({ kind: "error", message: data.error ?? `The import failed (${res.status}).`, errors: data.errors ?? [] });
        return;
      }
      setRun({ kind: "done", result: data as ImportResult });
      router.refresh();
    } catch {
      setRun({ kind: "error", message: "Could not reach Duely. Check your connection and try again.", errors: [] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Import steps">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx("flex shrink-0 items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-bold", i < step ? "bg-good-soft text-good-fg" : i === step ? "bg-primary text-primary-fg" : "bg-surface-3 text-fg-muted")} aria-current={i === step ? "step" : undefined}>
            <span className="grid size-5 place-items-center rounded-full bg-surface/30 text-xs">{i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <label htmlFor="import-month" className="font-display text-xl font-extrabold tracking-tight">Month to import</label>
          <p className="text-sm text-fg-muted">The books must close on this month&apos;s last day. {target?.imported ? "This month already has imported files: running it again replaces them." : ""}</p>
        </div>
        <select id="import-month" value={month} onChange={(e) => { setMonth(e.target.value); setRun({ kind: "idle" }); }} className="input sm:w-72">
          {months.map((m) => <option key={m.value} value={m.value}>{monthLabel(m.value)}{m.imported ? " (imported)" : ""}</option>)}
        </select>
      </section>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={clsx("flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-primary bg-primary-soft" : "border-border bg-surface")}
      >
        <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><UploadCloud className="size-8" aria-hidden="true" /></span>
        <p className="mt-4 font-display text-2xl font-extrabold tracking-tight">Drop {monthLabel(month)}&apos;s month-end exports</p>
        <p className="mt-1 text-sm text-fg-muted">CSV or Excel, several at once. Nothing is saved until you press Run the month.</p>
        <button type="button" onClick={() => input.current?.click()} className="btn btn-primary mt-5">Choose files</button>
        <input ref={input} type="file" accept=".csv,.xlsx,.xls" multiple className="sr-only" aria-label="Choose files" onChange={(e) => e.target.files && void add(e.target.files)} />
        <p className="mt-3 text-xs text-fg-subtle">You need {REQUIRED_TABLES.length} files: customers, sales, payments, aging, checks, bounced checks, collection activity, credit memos, disputes, ledger extract and the two loss-history tables.</p>
      </div>

      {files.length > 0 && (
        <>
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Files recognised</h2>
            <p className="mb-3 text-sm text-fg-muted">{recognised.length} of {files.length} matched to a table{missing.length > 0 && ` · still missing: ${missing.map((m) => TABLES[m].label).join(", ")}`}</p>
            <ul className="list-group">
              {files.map((f, i) => (
                <li key={f.name}>
                  <button type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={clsx("pad-y flex w-full items-center gap-3 px-4 text-left", sel === i ? "bg-primary-soft" : "hover:bg-surface-2")}>
                    <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full", f.table ? "bg-good-soft text-good-fg" : "bg-warn-soft text-warn-fg")}><FileSpreadsheet className="size-5" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{f.name}</span>
                      <span className="block truncate text-[13px] text-fg-muted">{f.error ? `Could not read: ${f.error}` : `${f.rowCount.toLocaleString()} rows · ${f.headers.length} columns`}</span>
                    </span>
                    <span className={clsx("shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-bold", f.table ? "bg-good-soft text-good-fg" : "bg-warn-soft text-warn-fg")}>{f.table ? TABLES[f.table].label : "Not recognised"}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => { setFiles([]); setSel(0); setDateFmt(""); setRun({ kind: "idle" }); }} className="btn btn-ghost btn-sm mt-3"><X className="size-4" aria-hidden="true" />Clear files</button>
          </section>

          {current && (
            <section className="card p-5 sm:p-6">
              <h2 className="break-words font-display text-xl font-extrabold tracking-tight">Column matching · {current.name}</h2>
              {!current.table ? (
                <p className="mt-2 text-sm text-fg-muted">This file was not recognised and will be left out. Rename it after its table (for example ar_aging.csv) and add it again.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead><tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-fg-subtle"><th className="py-2 pr-3">Duely field</th><th className="py-2 pr-3">Your column</th><th className="py-2 pr-3">Match</th><th className="py-2">Sample</th></tr></thead>
                    <tbody>
                      {mapping.map((m) => (
                        <tr key={m.target} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-3 font-mono text-xs font-bold">{m.target}</td>
                          <td className="py-2.5 pr-3">{m.header ?? <span className="text-bad-fg">Not found</span>}</td>
                          <td className="py-2.5 pr-3"><span className={clsx("rounded-pill px-2 py-0.5 text-xs font-bold", m.how === "exact" ? "bg-good-soft text-good-fg" : m.how === "synonym" ? "bg-warn-soft text-warn-fg" : "bg-bad-soft text-bad-fg")}>{m.how === "exact" ? "Exact" : m.how === "synonym" ? "Synonym" : "Missing"}</span></td>
                          <td className="num truncate py-2.5 text-fg-muted">{m.header ? current.rows[0]?.[m.header] : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {current.rows.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-primary">Preview first rows</summary>
                  <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-surface-2">{current.headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-bold">{h}</th>)}</tr></thead>
                      <tbody className="num">{current.rows.map((r, i) => <tr key={i} className="border-t border-border">{current.headers.map((h) => <td key={h} className="whitespace-nowrap px-3 py-1.5">{r[h]}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </details>
              )}
            </section>
          )}

          {ambiguous && (
            <section className="card border-warn p-5 sm:p-6">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn-soft text-warn-fg"><HelpCircle className="size-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-tight">Quick question about dates</h2>
                  <p className="mt-1 text-sm text-fg-muted">In <b>{ambiguous.name}</b> we found <b className="num">{ambiguous.dateSample}</b>. Which does it mean?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const [a, b, y] = (ambiguous.dateSample ?? "").split(/[/.-]/);
                      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return (
                        <>
                          <button type="button" aria-pressed={dateFmt === "dmy"} onClick={() => setDateFmt("dmy")} className={clsx("btn", dateFmt === "dmy" ? "btn-primary" : "btn-secondary")}>{Number(a)} {names[Number(b) - 1]} {y} (day first)</button>
                          <button type="button" aria-pressed={dateFmt === "mdy"} onClick={() => setDateFmt("mdy")} className={clsx("btn", dateFmt === "mdy" ? "btn-primary" : "btn-secondary")}>{names[Number(a) - 1]} {Number(b)}, {y} (month first)</button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Check and run</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex items-start gap-2">{missing.length === 0 ? <CheckCircle2 className="size-5 shrink-0 text-good" aria-hidden="true" /> : <AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />}{missing.length === 0 ? `All ${REQUIRED_TABLES.length} required files are here` : `${missing.length} required ${missing.length === 1 ? "file is" : "files are"} still missing`}</li>
              {columnGaps.length > 0 && <li className="flex items-start gap-2"><AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />Missing columns in {columnGaps.map((f) => f.name).join(", ")}</li>}
              <li className="flex items-start gap-2">{recon.aging ? <CheckCircle2 className="size-5 shrink-0 text-good" aria-hidden="true" /> : <AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />}AR aging {recon.aging ? `loaded (${recon.aging.rowCount.toLocaleString()} open invoices)` : "missing"}</li>
              <li className="flex items-start gap-2">{recon.gl ? <CheckCircle2 className="size-5 shrink-0 text-good" aria-hidden="true" /> : <AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />}Ledger extract {recon.gl ? "loaded. Its control balance must be dated the month's last day." : "missing"}</li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!ready || run.kind === "sending"} onClick={() => void runMonth()} className="btn btn-primary">
                {run.kind === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}Run the month
              </button>
              {!ready && run.kind !== "sending" && <span className="text-sm text-fg-muted">{missing.length || columnGaps.length ? "Add the missing files or columns first." : "Answer the date question first."}</span>}
            </div>

            <div aria-live="polite">
              {run.kind === "sending" && (
                <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold">
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                  Sending {run.count} files for {monthLabel(month)}, checking them and running the rules engine…
                </p>
              )}
              {run.kind === "error" && (
                <div role="alert" className="mt-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad-fg">
                  <p className="font-bold">{run.message}</p>
                  {run.errors.length > 0 && <ul className="mt-1 list-disc pl-5">{run.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                </div>
              )}
              {run.kind === "done" && <ImportDone r={run.result} />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ImportDone({ r }: { r: ImportResult }) {
  const gap = r.control.gap;
  return (
    <div role="status" className="mt-4 flex flex-col gap-3 rounded-2xl bg-good-soft px-4 py-4 text-sm text-good-fg">
      <p className="flex items-start gap-2 font-bold">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>{r.label} imported: {r.files.length} files, <span className="num">{r.openInvoices.toLocaleString()}</span> open invoices, <span className="num">{r.clientsToFollowUp}</span> clients to follow up.</span>
      </p>
      <p className="text-fg">
        Control check: aging total <span className="num font-bold">{peso(r.control.agingTotal)}</span> vs ledger <span className="num font-bold">{peso(r.control.ledgerAr)}</span>.{" "}
        {Math.abs(gap) < 0.005 ? "They agree." : <>Gap <span className="num font-bold">{peso(gap)}</span>{r.control.unappliedRefs.length ? `, traced to unapplied payments (${r.control.unappliedRefs.join(", ")})` : ""}.</>}
      </p>
      {r.store === "memory" && (
        <p className="text-fg-muted">Demo-session import: the database is not connected, so these files are kept on this server only and disappear when it restarts.</p>
      )}
      {r.warnings.length > 0 && <ul className="list-disc pl-5 text-fg-muted">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      <div>
        <Link href="/today" className="btn btn-primary btn-sm">Open Today<ArrowRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
