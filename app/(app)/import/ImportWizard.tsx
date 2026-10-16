"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import Papa from "papaparse";
import clsx from "clsx";
import { AlertTriangle, Check, CheckCircle2, FileSpreadsheet, HelpCircle, Play, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";

/** Expected tables and the canonical columns each needs (subset shown in mapping). */
const TABLES: Record<string, { label: string; columns: string[]; hint: RegExp }> = {
  customers: { label: "Customer master", columns: ["client_code", "segment", "area", "rep", "collector", "payment_terms_days", "credit_limit"], hint: /customer|client|master/i },
  ar_aging: { label: "AR aging", columns: ["client_code", "inv_no", "invoice_date", "due_date", "balance", "days_overdue", "bucket"], hint: /aging|ageing|ar_/i },
  sales_invoices: { label: "Sales invoices", columns: ["inv_no", "invoice_date", "due_date", "client_code", "net_amount"], hint: /sales|invoice/i },
  payments: { label: "Payments", columns: ["payment_id", "payment_date", "client_code", "applied_to_invoice", "amount"], hint: /payment|receipt|collection(?!_)/i },
  pdc_register: { label: "PDC register", columns: ["check_no_masked", "client_code", "amount", "check_date", "status"], hint: /pdc|check|cheque/i },
  bounced_checks: { label: "Bounced checks", columns: ["client_code", "amount", "date_returned", "replaced"], hint: /bounce|return/i },
  collection_activity: { label: "Collection activity", columns: ["activity_date", "client_code", "collector", "outcome", "promise_amount"], hint: /activity|contact|collection_/i },
  credit_memos: { label: "Credit memos", columns: ["memo_no", "memo_date", "client_code", "amount", "approver_role"], hint: /memo|credit/i },
  disputes: { label: "Disputes", columns: ["dispute_id", "client_code", "inv_no", "amount", "status"], hint: /dispute/i },
  gl_extract: { label: "GL extract", columns: ["account", "as_of", "balance"], hint: /gl|ledger/i },
};

/** Synonyms for header matching. */
const SYN: Record<string, string[]> = {
  client_code: ["client_code", "customer code", "cust code", "customer id", "client id", "account no", "customer_no", "cust_id"],
  inv_no: ["inv_no", "invoice no", "invoice number", "invoice #", "si no", "doc no", "inv"],
  invoice_date: ["invoice_date", "inv date", "date issued", "doc date", "si date"],
  due_date: ["due_date", "due", "maturity", "date due"],
  balance: ["balance", "open amount", "amount due", "outstanding", "bal"],
  amount: ["amount", "amt", "value", "check amount", "payment amount"],
  days_overdue: ["days_overdue", "days past due", "dpd", "age days", "days late"],
  check_date: ["check_date", "cheque date", "date on check", "pdc date"],
  payment_date: ["payment_date", "date paid", "or date", "receipt date"],
  credit_limit: ["credit_limit", "limit", "credit line"],
  net_amount: ["net_amount", "net", "net sales", "amount net"],
};

interface FileInfo {
  name: string; size: number; table: string | null; headers: string[]; rows: Record<string, string>[]; rowCount: number; dateSample: string | null; error?: string;
}

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim(); }

function matchColumn(target: string, headers: string[]): { header: string | null; how: "exact" | "synonym" | "none" } {
  const exact = headers.find((h) => norm(h) === norm(target));
  if (exact) return { header: exact, how: "exact" };
  const syns = (SYN[target] ?? []).map(norm);
  const s = headers.find((h) => syns.includes(norm(h)) || syns.some((x) => norm(h).includes(x)));
  return s ? { header: s, how: "synonym" } : { header: null, how: "none" };
}

function guessTable(name: string, headers: string[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const [key, t] of Object.entries(TABLES)) {
    const hits = t.columns.filter((c) => matchColumn(c, headers).header).length / t.columns.length;
    const score = hits + (t.hint.test(name) ? 0.35 : 0) + (name.toLowerCase().includes(key) ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return bestScore >= 0.5 ? best : null;
}

function ambiguousDate(rows: Record<string, string>[], headers: string[]): string | null {
  for (const h of headers.filter((x) => /date|due/i.test(x))) {
    for (const r of rows) {
      const v = r[h];
      const m = v?.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      if (m && Number(m[1]) <= 12 && Number(m[2]) <= 12) return v;
    }
  }
  return null;
}

async function readFile(f: File): Promise<FileInfo> {
  try {
    if (/\.xlsx?$/i.test(f.name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: "" }).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])));
      const headers = rows[0] ? Object.keys(rows[0]) : [];
      return { name: f.name, size: f.size, headers, rows: rows.slice(0, 5), rowCount: rows.length, table: guessTable(f.name, headers), dateSample: ambiguousDate(rows.slice(0, 50), headers) };
    }
    const text = await f.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const headers = parsed.meta.fields ?? [];
    return { name: f.name, size: f.size, headers, rows: parsed.data.slice(0, 5), rowCount: parsed.data.length, table: guessTable(f.name, headers), dateSample: ambiguousDate(parsed.data.slice(0, 50), headers) };
  } catch (e) {
    return { name: f.name, size: f.size, headers: [], rows: [], rowCount: 0, table: null, dateSample: null, error: (e as Error).message };
  }
}

const STEPS = ["Upload", "Recognise", "Match columns", "Check dates", "Reconcile"];

export function ImportWizard({ periodLabel }: { periodLabel: string }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState(0);
  const [dateFmt, setDateFmt] = useState<"" | "dmy" | "mdy">("");
  const [ran, setRan] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const add = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => /\.(csv|xlsx|xls)$/i.test(f.name));
    const infos = await Promise.all(arr.map(readFile));
    setFiles((prev) => [...prev.filter((p) => !infos.some((i) => i.name === p.name)), ...infos]);
    setRan(false);
  }, []);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    void add(e.dataTransfer.files);
  }

  const recognised = files.filter((f) => f.table);
  const missing = Object.keys(TABLES).filter((t) => !files.some((f) => f.table === t));
  const current = files[sel];
  const ambiguous = files.find((f) => f.dateSample);
  const step = files.length === 0 ? 0 : !ambiguous || dateFmt ? 4 : 3;

  const mapping = useMemo(() => {
    if (!current?.table) return [];
    return TABLES[current.table].columns.map((c) => ({ target: c, ...matchColumn(c, current.headers) }));
  }, [current]);

  const recon = useMemo(() => {
    const aging = files.find((f) => f.table === "ar_aging");
    const gl = files.find((f) => f.table === "gl_extract");
    return { aging, gl };
  }, [files]);

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Import steps">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx("flex shrink-0 items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-bold", i < step ? "bg-good-soft text-good-fg" : i === step ? "bg-primary text-primary-fg" : "bg-surface-3 text-fg-muted")} aria-current={i === step ? "step" : undefined}>
            <span className="grid size-5 place-items-center rounded-full bg-surface/30 text-xs">{i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={clsx("flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-primary bg-primary-soft" : "border-border bg-surface")}
      >
        <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><UploadCloud className="size-8" aria-hidden="true" /></span>
        <p className="mt-4 font-display text-2xl font-extrabold tracking-tight">Drop your month-end exports</p>
        <p className="mt-1 text-sm text-fg-muted">CSV or Excel, several at once. Files stay in your browser for this preview.</p>
        <button type="button" onClick={() => input.current?.click()} className="btn btn-primary mt-5">Choose files</button>
        <input ref={input} type="file" accept=".csv,.xlsx,.xls" multiple className="sr-only" aria-label="Choose files" onChange={(e) => e.target.files && void add(e.target.files)} />
        <p className="mt-3 text-xs text-fg-subtle">Tip: use the month-end files your finance team exports (aging, ledger, checks and collections).</p>
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
                    <span className={clsx("rounded-pill px-2.5 py-0.5 text-xs font-bold", f.table ? "bg-good-soft text-good-fg" : "bg-warn-soft text-warn-fg")}>{f.table ? TABLES[f.table].label : "Not recognised"}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => { setFiles([]); setSel(0); setDateFmt(""); setRan(false); }} className="btn btn-ghost btn-sm mt-3"><X className="size-4" aria-hidden="true" />Clear files</button>
          </section>

          {current && (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Column matching · {current.name}</h2>
              {!current.table ? (
                <p className="mt-2 text-sm text-fg-muted">Pick the file type to map its columns.</p>
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
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return (
                        <>
                          <button type="button" aria-pressed={dateFmt === "dmy"} onClick={() => setDateFmt("dmy")} className={clsx("btn", dateFmt === "dmy" ? "btn-primary" : "btn-secondary")}>{Number(a)} {months[Number(b) - 1]} {y} (day first)</button>
                          <button type="button" aria-pressed={dateFmt === "mdy"} onClick={() => setDateFmt("mdy")} className={clsx("btn", dateFmt === "mdy" ? "btn-primary" : "btn-secondary")}>{months[Number(a) - 1]} {Number(b)}, {y} (month first)</button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Reconciliation preview</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">{recon.aging ? <CheckCircle2 className="size-5 text-good" aria-hidden="true" /> : <AlertTriangle className="size-5 text-warn" aria-hidden="true" />}AR aging {recon.aging ? `loaded (${recon.aging.rowCount} open invoices)` : "missing"}</li>
              <li className="flex items-center gap-2">{recon.gl ? <CheckCircle2 className="size-5 text-good" aria-hidden="true" /> : <AlertTriangle className="size-5 text-warn" aria-hidden="true" />}GL control account {recon.gl ? "loaded" : "missing"}</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-5 text-good" aria-hidden="true" />Aging total is compared with the ledger, and any gap is traced to unapplied payments when the engine runs.</li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!!ambiguous && !dateFmt} onClick={() => { setRan(true); router.refresh(); }} className="btn btn-primary"><Play className="size-4" aria-hidden="true" />Run the month</button>
              <span className="rounded-pill bg-surface-3 px-3 py-1 text-xs font-bold text-fg-muted">Demo: re-runs the {periodLabel} demo books</span>
            </div>
            {ran && <p role="status" className="mt-3 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good-fg">Done. The engine re-ran the {periodLabel} demo books. Open Today to see the ranked list.</p>}
          </section>
        </>
      )}
    </div>
  );
}
