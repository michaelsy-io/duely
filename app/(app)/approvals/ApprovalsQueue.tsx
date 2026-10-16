"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, CheckCircle2, Inbox, Loader2, RefreshCw, ShieldAlert, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { burstConfettiFrom } from "@/components/motion/confetti";

interface Review { verdict?: string; issues?: string[]; unknownNumbers?: string[]; checks?: Record<string, boolean>; critique?: string }
export interface Draft {
  id: string; client_code: string; tone: string; channel: string | null; subject: string | null; body: string | null;
  review: Review | null; status: string; needs_top_mgmt: boolean; approved_by: string | null; created_at: string;
}

const CHECK_LABEL: Record<string, string> = { numbers: "Numbers match engine", legal: "No legal threats", length: "Length OK" };

type Decision = "approve" | "reject" | null;
const EASE = [0.16, 1, 0.3, 1] as const;
/** Decided drafts leave sideways: right for approve, left for reject; a plain fade when just switching drafts. */
const leave = (d: Decision, dist: number) => ({ opacity: 0, x: d === "approve" ? dist : d === "reject" ? -dist : 0, transition: { duration: d ? 0.2 : 0.12, ease: EASE } });
const cardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, x: 0, transition: { duration: 0.24, ease: EASE } },
  exit: (d: Decision) => leave(d, 56),
};
const rowVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, x: 0 },
  exit: (d: Decision) => leave(d, 24),
};

export function ApprovalsQueue({ initialDrafts, period, role, by, names, escalations }: {
  initialDrafts: Draft[] | null; period: string; role: string; by: string;
  names: Record<string, { name: string; overdue: string; days: number }>;
  escalations: { code: string; name: string; action: string; trigger: string; approver: string }[];
}) {
  const [drafts, setDrafts] = useState<Draft[] | null>(initialDrafts);
  const [unavailable, setUnavailable] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [lastDecision, setLastDecision] = useState<Decision>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/drafts?period=${period}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { drafts?: Draft[] };
      setDrafts(j.drafts ?? []);
      setUnavailable(false);
    } catch {
      setDrafts([]);
      setUnavailable(true);
    }
  }, [period]);

  // Only fetch on mount if the server could not supply the drafts.
  useEffect(() => { if (initialDrafts === null) void load(); }, [load, initialDrafts]);

  const pending = useMemo(() => (drafts ?? []).filter((d) => d.status === "pending" || d.status === "needs_edit"), [drafts]);
  const done = useMemo(() => (drafts ?? []).filter((d) => !(d.status === "pending" || d.status === "needs_edit")), [drafts]);
  const list = tab === "pending" ? pending : done;
  const current = list.find((d) => d.id === sel) ?? list[0] ?? null;
  const listKey = list.map((d) => d.id).join();

  useEffect(() => { setEdit(current?.body ?? ""); setMsg(null); }, [current?.id, current?.body]);

  async function generate() {
    setBusy("gen");
    setMsg(null);
    try {
      const r = await fetch("/api/agents/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period, limit: 6 }) });
      if (!r.ok) throw new Error();
      await load();
      setMsg({ tone: "good", text: "Drafts created for the top of today's list." });
    } catch {
      setMsg({ tone: "warn", text: "Draft unavailable. The AI service is offline; collectors can still use the engine's reason text." });
    } finally {
      setBusy(null);
    }
  }

  async function decide(d: Draft, action: "approve" | "reject", topMgmt = false, from?: Element | null) {
    setBusy(d.id + action);
    setLastDecision(null);
    setMsg(null);
    try {
      const r = await fetch(`/api/drafts/${d.id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action === "approve" ? { by, top_mgmt: topMgmt } : { by }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || "Could not save");
      // Only after the server route has accepted the decision: animate it away (and celebrate approvals).
      setLastDecision(action);
      if (action === "approve") burstConfettiFrom(from);
      setMsg({ tone: action === "approve" ? "good" : "warn", text: action === "approve" ? "Approved. Ready to send." : "Rejected. The collector will be told." });
      await load();
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message || "Could not save" });
    } finally {
      setBusy(null);
    }
  }

  const canTop = role === "cfo" || role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-pill bg-surface-3 p-1" role="tablist" aria-label="Queue">
          {(["pending", "done"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => { setTab(t); setSel(null); setLastDecision(null); }} className={clsx("relative min-h-[40px] rounded-pill px-4 text-sm font-bold transition-colors", tab === t ? "text-fg" : "text-fg-muted")}>
              {tab === t && <motion.span layoutId="approvals-tab" aria-hidden="true" className="absolute inset-0 rounded-pill bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">{t === "pending" ? `Waiting (${pending.length})` : `Decided (${done.length})`}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-ghost btn-sm" aria-label="Refresh"><RefreshCw className="size-4" aria-hidden="true" />Refresh</button>
        <button type="button" onClick={generate} disabled={busy === "gen"} className="btn btn-secondary btn-sm ml-auto">
          {busy === "gen" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          Draft for today&apos;s top clients
        </button>
      </div>

      {msg && (
        <p role="status" className={clsx("anim-fade rounded-2xl px-4 py-3 text-sm font-semibold", { good: "bg-good-soft text-good-fg", bad: "bg-bad-soft text-bad-fg", warn: "bg-warn-soft text-warn-fg" }[msg.tone])}>{msg.text}</p>
      )}

      {drafts === null ? (
        <div className="card flex items-center justify-center gap-2 px-6 py-16 text-fg-muted"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Loading drafts…</div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><Inbox className="size-7" aria-hidden="true" /></span>
          <p className="mt-4 font-display text-2xl font-extrabold tracking-tight">{tab === "pending" ? "No drafts waiting" : "Nothing decided yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-fg-muted">{unavailable ? "The drafts service is not connected yet." : "Draft a reminder from a client page, or let the agents draft for the top of today's list."}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="list-group relative self-start" role="listbox" aria-label="Drafts">
            <AnimatePresence initial={false} mode="popLayout" custom={lastDecision}>
            {list.map((d) => {
              const n = names[d.client_code];
              const active = current?.id === d.id;
              return (
                <motion.button
                  key={d.id} role="option" aria-selected={active} type="button" onClick={() => { setSel(d.id); setLastDecision(null); }}
                  layout="position" layoutDependency={listKey} custom={lastDecision} variants={rowVariants} initial="initial" animate="enter" exit="exit"
                  transition={{ duration: 0.2, ease: EASE, layout: { type: "spring", stiffness: 500, damping: 42 } }}
                  className={clsx("pad-y flex w-full items-center gap-3 px-4 text-left transition-colors", active ? "bg-primary-soft" : "hover:bg-surface-2")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{n?.name ?? d.client_code}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{d.client_code} · {d.tone} {d.channel ?? ""}{n ? ` · ${n.overdue}` : ""}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {d.needs_top_mgmt && <span className="rounded-pill bg-bad-soft px-2 py-0.5 text-[10px] font-bold text-bad-fg">Top mgmt</span>}
                    <span className={clsx("rounded-pill px-2 py-0.5 text-[10px] font-bold capitalize", d.review?.verdict === "pass" ? "bg-good-soft text-good-fg" : d.review?.verdict === "block" ? "bg-bad-soft text-bad-fg" : "bg-warn-soft text-warn-fg")}>{d.status === "pending" ? d.review?.verdict ?? "pending" : d.status.replace("_", " ")}</span>
                  </span>
                </motion.button>
              );
            })}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait" initial={false} custom={lastDecision}>
          {current && (
            <motion.div key={current.id} custom={lastDecision} variants={cardVariants} initial="initial" animate="enter" exit="exit" className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{current.tone} {current.channel}</p>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight">{names[current.client_code]?.name ?? current.client_code}</h2>
                  <Link href={`/clients/${current.client_code}`} className="text-sm font-semibold text-primary hover:underline">Open client · {current.client_code}</Link>
                </div>
                {current.needs_top_mgmt && <span className="inline-flex items-center gap-1 rounded-pill bg-bad-soft px-3 py-1 text-xs font-bold text-bad-fg"><ShieldAlert className="size-3.5" aria-hidden="true" />Needs top management</span>}
              </div>

              {current.subject && <p className="mt-4 text-sm"><span className="font-bold">Subject:</span> {current.subject}</p>}
              <label htmlFor="draft-body" className="mt-3 block text-sm font-bold">Message</label>
              <textarea id="draft-body" value={edit} onChange={(e) => setEdit(e.target.value)} rows={9} className="mt-1.5 w-full rounded-2xl border border-border bg-bg p-4 text-[14.5px] leading-relaxed text-fg focus:border-primary focus:outline-none" />
              {edit !== (current.body ?? "") && <p className="mt-1 text-xs font-semibold text-warn-fg">Edited. Changes are kept on this screen for the demo; the reviewer re-checks numbers on approve.</p>}

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">Reviewer checks</p>
                <div className="flex flex-wrap gap-2">
                  {current.review?.checks ? Object.entries(current.review.checks).map(([k, ok]) => (
                    <span key={k} className={clsx("inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold", ok ? "bg-good-soft text-good-fg" : "bg-bad-soft text-bad-fg")}>
                      {ok ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}{CHECK_LABEL[k] ?? k}
                    </span>
                  )) : <span className="text-sm text-fg-muted">No review attached.</span>}
                </div>
                {!!current.review?.issues?.length && <ul className="mt-2 list-disc pl-5 text-sm text-bad-fg">{current.review.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
                {current.review?.critique && <p className="mt-2 text-sm text-fg-muted">{current.review.critique}</p>}
              </div>

              {tab === "pending" ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {current.needs_top_mgmt ? (
                    <button type="button" disabled={!canTop || !!busy} onClick={(e) => decide(current, "approve", true, e.currentTarget)} className="btn btn-primary" title={canTop ? undefined : "Switch to CFO or Admin to approve final notices"}>
                      <CheckCircle2 className="size-4" aria-hidden="true" />{canTop ? "Approve as top management" : "Needs top management"}
                    </button>
                  ) : (
                    <button type="button" disabled={!!busy} onClick={(e) => decide(current, "approve", false, e.currentTarget)} className="btn btn-primary"><CheckCircle2 className="size-4" aria-hidden="true" />Approve</button>
                  )}
                  <button type="button" disabled={!!busy} onClick={() => decide(current, "reject")} className="btn btn-danger"><X className="size-4" aria-hidden="true" />Reject</button>
                </div>
              ) : (
                <p className="mt-6 text-sm text-fg-muted">Status: <b className="capitalize text-fg">{current.status.replace("_", " ")}</b>{current.approved_by && ` by ${current.approved_by}`}</p>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}

      <section>
        <h2 className="mb-1 font-display text-xl font-extrabold tracking-tight">Escalations to review</h2>
        <p className="mb-3 text-sm text-fg-muted">Recommended by the rules engine. Credit holds go to middle management, then top.</p>
        <div className="list-group">
          {escalations.map((e) => (
            <Link key={e.code} href={`/clients/${e.code}`} className="pad-y flex items-center gap-3 px-4 hover:bg-surface-2 sm:px-5">
              <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full", /hold/i.test(e.action) ? "bg-bad-soft text-bad-fg" : "bg-warn-soft text-warn-fg")}><ShieldAlert className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{e.name}</span>
                <span className="block truncate text-[13px] text-fg-muted">{e.code} · {e.trigger}</span>
              </span>
              <span className="flex flex-col items-end gap-1 text-right">
                <span className={clsx("rounded-pill px-2.5 py-0.5 text-xs font-bold", /hold/i.test(e.action) ? "bg-bad-soft text-bad-fg" : "bg-warn-soft text-warn-fg")}>{e.action}</span>
                <span className="hidden text-[11px] text-fg-subtle sm:block">{e.approver}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
