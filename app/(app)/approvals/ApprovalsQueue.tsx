"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, CheckCircle2, Inbox, Loader2, Lock, RefreshCw, RotateCcw, ShieldAlert, PenLine, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { burstConfettiFrom } from "@/components/motion/confetti";

interface Review { verdict?: string; issues?: string[]; unknownNumbers?: string[]; checks?: Record<string, boolean>; critique?: string; seed?: boolean }
export interface Draft {
  id: string; client_code: string; tone: string; channel: string | null; subject: string | null; body: string | null;
  review: Review | null; status: string; needs_top_mgmt: boolean; approved_by: string | null; created_at: string;
}
export interface EscDecision { client_code: string; decision: "approved" | "dismissed" | "open"; decided_by: string | null; decided_at: string }

const CHECK_LABEL: Record<string, string> = { numbers: "Numbers match engine", legal: "No legal threats", length: "Length OK" };
/** How many clients one "Draft for today's top clients" run covers. Drafted one at a time so progress is real. */
const RUN_SIZE = 5;
/** good-fg on good-soft is just under 4.5:1 in the default theme; nudge it toward ink for small badge text. */
const GOOD_BADGE = "bg-good-soft text-[color-mix(in_srgb,var(--good-fg)_78%,var(--fg))]";
const BAD_BADGE = "bg-bad-soft text-bad-fg";
const WARN_BADGE = "bg-warn-soft text-warn-fg";

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

interface Progress { step: number; total: number; done: string[] }

export function ApprovalsQueue({ initialDrafts, initialSelected, seeded, period, role, by, names, escalations, decisions: initialDecisions, decisionStore, canDecide }: {
  initialDrafts: Draft[] | null; initialSelected: string | null; seeded: number; period: string; role: string; by: string;
  names: Record<string, { name: string; overdue: string; days: number }>;
  escalations: { code: string; name: string; action: string; trigger: string; approver: string }[];
  decisions: Record<string, EscDecision>; decisionStore: "db" | "cookie"; canDecide: boolean;
}) {
  const [drafts, setDrafts] = useState<Draft[] | null>(initialDrafts);
  const [unavailable, setUnavailable] = useState(false);
  const [sel, setSel] = useState<string | null>(initialSelected);
  const [edit, setEdit] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(
    seeded > 0 ? { tone: "good", text: `We prepared ${seeded} sample drafts so you can try the approval flow. Final notices stay locked until a CFO or Admin signs.` } : null,
  );
  const [tab, setTab] = useState<"pending" | "done">(() => {
    const d = initialSelected ? initialDrafts?.find((x) => x.id === initialSelected) : null;
    return d && !(d.status === "pending" || d.status === "needs_edit") ? "done" : "pending";
  });
  const [lastDecision, setLastDecision] = useState<Decision>(null);
  const [escDecisions, setEscDecisions] = useState(initialDecisions);
  const [escStore, setEscStore] = useState(decisionStore);
  const [escBusy, setEscBusy] = useState<string | null>(null);
  const [escError, setEscError] = useState<string | null>(null);

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

  useEffect(() => { setEdit(current?.body ?? ""); }, [current?.id, current?.body]);

  /** Drafts one client per request so the progress shown is real. Each request writes, checks numbers and stores one draft. */
  async function generate() {
    setBusy("gen");
    setMsg(null);
    const names_: string[] = [];
    let ai = false;
    let failed = false;
    try {
      for (let step = 1; step <= RUN_SIZE; step++) {
        setProgress({ step, total: RUN_SIZE, done: [...names_] });
        const r = await fetch("/api/agents/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period, limit: 1 }) });
        if (!r.ok) { failed = true; break; }
        const j = (await r.json()) as { created?: { client_code: string }[]; ai?: boolean };
        ai = !!j.ai;
        const made = j.created?.[0];
        if (!made) break; // nobody left to draft for
        names_.push(names[made.client_code]?.name ?? made.client_code);
        await load();
      }
    } catch {
      failed = true;
    }
    setProgress(null);
    setBusy(null);
    if (names_.length === 0) {
      setMsg(failed
        ? { tone: "warn", text: "Could not draft right now. Collectors can still use the engine's reason text on each client page." }
        : { tone: "good", text: "Every client at the top of today's list already has a draft waiting, is on hold, or has an open promise to pay." });
      return;
    }
    setTab("pending");
    setSel(null);
    const how = ai ? "written by AI" : "written from engine templates (no AI key)";
    setMsg({
      tone: failed ? "warn" : "good",
      text: `${names_.length} ${names_.length === 1 ? "draft" : "drafts"} ${how}, every number checked against the engine. They wait here for your approval.${failed ? " The rest could not be drafted right now." : ""}`,
    });
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

  async function decideEscalation(code: string, decision: "approved" | "dismissed" | "open") {
    setEscBusy(code);
    setEscError(null);
    try {
      const r = await fetch("/api/escalations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period, client_code: code, decision }) });
      const j = (await r.json().catch(() => ({}))) as { decision?: EscDecision; store?: "db" | "cookie"; error?: string };
      if (!r.ok || !j.decision) throw new Error(j.error || "Could not save");
      setEscDecisions((m) => ({ ...m, [code]: j.decision! }));
      if (j.store) setEscStore(j.store);
    } catch (e) {
      setEscError((e as Error).message || "Could not save");
    } finally {
      setEscBusy(null);
    }
  }

  const canTop = role === "cfo" || role === "admin";
  const canApprove = role !== "collector";
  const generating = busy === "gen";
  const showEmptyCta = drafts !== null && tab === "pending" && pending.length === 0;

  const progressPanel = progress && (
    <div role="status" aria-live="polite" className="w-full max-w-md text-left">
      <p className="flex items-center gap-2 text-sm font-bold text-fg">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
        Drafting {progress.step} of {progress.total} · writing and checking numbers
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-3" aria-hidden="true">
        <div className="h-full rounded-pill bg-primary transition-[width] duration-500" style={{ width: `${((progress.step - 0.5) / progress.total) * 100}%` }} />
      </div>
      {progress.done.length > 0 && <p className="mt-2 text-xs text-fg-muted">Ready for approval: {progress.done.join(", ")}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
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
          {!showEmptyCta && (
            <button type="button" onClick={generate} disabled={generating} className="btn btn-secondary ml-auto">
              {generating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PenLine className="size-4" aria-hidden="true" />}
              Draft for today&apos;s top clients
            </button>
          )}
        </div>
        {!showEmptyCta && progress && <div className="card px-5 py-4">{progressPanel}</div>}
      </div>

      {msg && (
        <p role="status" className={clsx("anim-fade rounded-2xl px-4 py-3 text-sm font-semibold", { good: GOOD_BADGE, bad: BAD_BADGE, warn: WARN_BADGE }[msg.tone])}>{msg.text}</p>
      )}

      {drafts === null ? (
        <div className="card flex items-center justify-center gap-2 px-6 py-16 text-fg-muted"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Loading drafts…</div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><Inbox className="size-7" aria-hidden="true" /></span>
          <p className="mt-4 font-display text-2xl font-extrabold tracking-tight">{tab === "pending" ? "No drafts waiting" : "Nothing decided yet"}</p>
          {tab === "pending" ? (
            <>
              <p className="mt-1 max-w-md text-sm text-fg-muted">
                We write a reminder for each of the top {RUN_SIZE} clients on today&apos;s list, check every number against the rules engine, then hold them here. Nothing is sent until someone approves.
              </p>
              {unavailable && <p className="mt-2 max-w-md text-xs font-semibold text-warn-fg">Could not reach the drafts service. Try Refresh, or draft anyway.</p>}
              <div className="mt-6 flex w-full flex-col items-center">
                {progress ? progressPanel : (
                  <button type="button" onClick={generate} disabled={generating} className="btn btn-primary">
                    <PenLine className="size-4" aria-hidden="true" />Draft for today&apos;s top clients
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 max-w-sm text-sm text-fg-muted">Approved and rejected drafts show up here.</p>
          )}
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
                  key={d.id} role="option" aria-selected={active} type="button" onClick={() => { setSel(d.id); setLastDecision(null); setMsg(null); }}
                  layout="position" layoutDependency={listKey} custom={lastDecision} variants={rowVariants} initial="initial" animate="enter" exit="exit"
                  transition={{ duration: 0.2, ease: EASE, layout: { type: "spring", stiffness: 500, damping: 42 } }}
                  className={clsx("pad-y flex w-full items-center gap-3 px-4 text-left transition-colors", active ? "bg-primary-soft" : "hover:bg-surface-2")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{n?.name ?? d.client_code}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{d.client_code} · {d.tone} {d.channel ?? ""}{n ? ` · ${n.overdue}` : ""}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {d.needs_top_mgmt && <span className={clsx("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-bold", BAD_BADGE)}><Lock className="size-3" aria-hidden="true" />Top mgmt</span>}
                    <span className={clsx("rounded-pill px-2 py-0.5 text-xs font-bold capitalize", d.review?.verdict === "pass" ? GOOD_BADGE : d.review?.verdict === "block" ? BAD_BADGE : WARN_BADGE)}>{d.status === "pending" ? d.review?.verdict ?? "pending" : d.status.replace("_", " ")}</span>
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
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-fg-muted">{current.tone} {current.channel}{current.review?.seed ? " · sample" : ""}</p>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight">{names[current.client_code]?.name ?? current.client_code}</h2>
                  <Link href={`/clients/${current.client_code}`} className="text-sm font-semibold text-primary hover:underline">Open client · {current.client_code}</Link>
                </div>
                {current.needs_top_mgmt && <span className={clsx("inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold", BAD_BADGE)}><ShieldAlert className="size-3.5" aria-hidden="true" />Needs top management</span>}
              </div>

              {current.subject && <p className="mt-4 text-sm"><span className="font-bold">Subject:</span> {current.subject}</p>}
              <label htmlFor="draft-body" className="mt-3 block text-sm font-bold">Message</label>
              <div className="receipt mt-1.5 p-3">
                <textarea id="draft-body" value={edit} onChange={(e) => setEdit(e.target.value)} readOnly={!canApprove} rows={9} className="block w-full resize-y rounded-md bg-transparent p-2 text-[14.5px] leading-relaxed text-ink focus:outline-2 focus:outline-primary" />
              </div>
              {edit !== (current.body ?? "") && <p className="mt-1 text-xs font-semibold text-warn-fg">Edited. Changes are kept on this screen for the demo; the reviewer re-checks numbers on approve.</p>}

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">Reviewer checks</p>
                <div className="flex flex-wrap gap-2">
                  {current.review?.checks ? Object.entries(current.review.checks).map(([k, ok]) => (
                    <span key={k} className={clsx("inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold", ok ? GOOD_BADGE : BAD_BADGE)}>
                      {ok ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}{CHECK_LABEL[k] ?? k}
                    </span>
                  )) : <span className="text-sm text-fg-muted">No review attached.</span>}
                </div>
                {!!current.review?.issues?.length && <ul className="mt-2 list-disc pl-5 text-sm text-bad-fg">{current.review.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
                {current.review?.critique && <p className="mt-2 text-sm text-fg-muted">{current.review.critique}</p>}
              </div>

              {tab === "pending" ? (
                !canApprove ? (
                  <p className="mt-6 text-sm text-fg-muted">Waiting for a supervisor to approve or reject.{current.needs_top_mgmt ? " As a final notice it also needs a CFO or Admin." : ""}</p>
                ) : (
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {current.needs_top_mgmt ? (
                        <button type="button" disabled={!canTop || !!busy} onClick={(e) => decide(current, "approve", true, e.currentTarget)} className="btn btn-primary">
                          {canTop ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}{canTop ? "Approve as top management" : "Needs top management"}
                        </button>
                      ) : (
                        <button type="button" disabled={!!busy} onClick={(e) => decide(current, "approve", false, e.currentTarget)} className="btn btn-primary"><CheckCircle2 className="size-4" aria-hidden="true" />Approve</button>
                      )}
                      <button type="button" disabled={!!busy} onClick={() => decide(current, "reject")} className="btn btn-danger"><X className="size-4" aria-hidden="true" />Reject</button>
                    </div>
                    {current.needs_top_mgmt && !canTop && <p className="text-sm text-fg-muted">Final notices stay locked until a CFO or Admin signs. Switch role to CFO to approve this one.</p>}
                  </div>
                )
              ) : (
                <p className="mt-6 text-sm text-fg-muted">Status: <b className="capitalize text-fg">{current.status.replace("_", " ")}</b>{current.approved_by && ` by ${current.approved_by}`}</p>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}

      <section aria-labelledby="esc-title">
        <h2 id="esc-title" className="mb-1 font-display text-xl font-extrabold tracking-tight">Escalations to review</h2>
        <p className="mb-3 text-sm text-fg-muted">
          Recommended by the rules engine. Credit holds go to middle management, then top.
          {!canDecide && " A supervisor, CFO or admin decides these."}
        </p>
        {escError && <p role="alert" className={clsx("mb-3 rounded-2xl px-4 py-3 text-sm font-semibold", BAD_BADGE)}>{escError}</p>}
        <div className="list-group">
          {escalations.map((e) => {
            const isHold = /hold/i.test(e.action);
            const d = escDecisions[e.code];
            const decided = d && d.decision !== "open" ? d : null;
            const rowBusy = escBusy === e.code;
            return (
              <div key={e.code} className={clsx("pad-y flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-5", decided && "bg-surface-2")}>
                <Link href={`/clients/${e.code}`} className="group flex min-w-0 flex-1 items-center gap-3">
                  <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full", isHold ? BAD_BADGE : WARN_BADGE)}><ShieldAlert className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold group-hover:underline">{e.name}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{e.code} · {e.trigger}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={clsx("rounded-pill px-2.5 py-0.5 text-xs font-bold", isHold ? BAD_BADGE : WARN_BADGE)}>{e.action}</span>
                      <span className="text-xs text-fg-muted">{e.approver}</span>
                    </span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:justify-end sm:pl-0">
                  {decided ? (
                    <>
                      <span className={clsx("inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold", decided.decision === "approved" ? GOOD_BADGE : "bg-surface-3 text-fg-muted")}>
                        {decided.decision === "approved" ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                        {decided.decision === "approved" ? (isHold ? "Hold approved" : "Approved") : "Dismissed"}{decided.decided_by ? ` by ${decided.decided_by}` : ""}
                      </span>
                      {canDecide && (
                        <button type="button" disabled={rowBusy} onClick={() => decideEscalation(e.code, "open")} className="btn btn-ghost btn-sm" aria-label={`Undo decision for ${e.name}`}>
                          {rowBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}Undo
                        </button>
                      )}
                    </>
                  ) : canDecide ? (
                    <>
                      <button type="button" disabled={rowBusy} onClick={() => decideEscalation(e.code, "approved")} className="btn btn-primary btn-sm" aria-label={`${isHold ? "Approve hold" : "Approve"} for ${e.name}`}>
                        {rowBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}{isHold ? "Approve hold" : "Approve"}
                      </button>
                      <button type="button" disabled={rowBusy} onClick={() => decideEscalation(e.code, "dismissed")} className="btn btn-ghost btn-sm" aria-label={`Dismiss escalation for ${e.name}`}>
                        <X className="size-4" aria-hidden="true" />Dismiss
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-fg-muted">Waiting for a decision</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {canDecide && escStore === "cookie" && escalations.length > 0 && (
          <p className="mt-2 text-xs text-fg-muted">Decisions are saved in this browser only for now. Run the escalation decisions migration in Supabase to share them with the team.</p>
        )}
      </section>
    </div>
  );
}
