"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, PenLine, X } from "lucide-react";
import clsx from "clsx";

interface DraftOut {
  id?: string;
  tone?: string;
  channel?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string;
  needs_top_mgmt?: boolean;
  review?: { verdict?: string; issues?: string[]; checks?: Record<string, boolean> } | null;
}

/** Calls POST /api/draft. Shows the draft and reviewer checks, or "Draft unavailable". */
export function DraftReminder({ code, period }: { code: string; period: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [tone, setTone] = useState<"" | "friendly" | "firm" | "final">("");
  const [draft, setDraft] = useState<DraftOut | null>(null);

  async function run() {
    setState("loading");
    try {
      const r = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_code: code, period, tone: tone || undefined }) });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { draft?: DraftOut };
      if (!j.draft?.body) throw new Error("empty");
      setDraft(j.draft);
      setState("done");
    } catch {
      setState("error");
    }
  }

  const checks = draft?.review?.checks;
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">Draft a reminder</h2>
          <p className="text-sm text-fg-muted">AI writes it, a reviewer checks every number, a supervisor approves.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-pill bg-surface-3 p-1" role="group" aria-label="Tone">
            {(["", "friendly", "firm", "final"] as const).map((t) => (
              <button key={t || "auto"} type="button" aria-pressed={tone === t} onClick={() => setTone(t)} className={clsx("min-h-[34px] rounded-pill px-3 text-xs font-bold capitalize", tone === t ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}>
                {t || "Auto"}
              </button>
            ))}
          </div>
          <button type="button" onClick={run} disabled={state === "loading"} className="btn btn-primary">
            <PenLine className="size-4" aria-hidden="true" />
            {state === "loading" ? "Drafting…" : state === "done" ? "Redraft" : "Draft a reminder"}
          </button>
        </div>
      </div>

      {state === "error" && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-fg">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> Draft unavailable. Use the reasons above for your call script.
        </p>
      )}

      {state === "done" && draft && (
        <div className="anim-fade mt-4 rounded-2xl border border-border bg-bg p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {draft.tone && <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-xs font-bold capitalize text-primary-soft-fg">{draft.tone}</span>}
            {draft.channel && <span className="rounded-pill bg-surface-3 px-2.5 py-0.5 text-xs font-bold uppercase text-fg-muted">{draft.channel}</span>}
            {draft.needs_top_mgmt && <span className="rounded-pill bg-bad-soft px-2.5 py-0.5 text-xs font-bold text-bad-fg">Needs top management</span>}
            <span className="rounded-pill bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn-fg">Waiting for approval</span>
          </div>
          {draft.subject && <p className="font-bold">{draft.subject}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">{draft.body}</p>
          {checks && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(checks).map(([k, ok]) => (
                <span key={k} className={clsx("inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-bold capitalize", ok ? "bg-good-soft text-good-fg" : "bg-bad-soft text-bad-fg")}>
                  {ok ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
                  {k === "numbers" ? "Numbers match engine" : k === "legal" ? "No legal threats" : k === "length" ? "Length OK" : k}
                </span>
              ))}
            </div>
          )}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-fg">
            <Check className="size-4 text-good-fg" aria-hidden="true" />Sent to Approvals.
            <Link href={draft.id ? `/approvals?draft=${draft.id}` : "/approvals"} className="text-primary underline-offset-2 hover:underline">View it</Link>
          </p>
        </div>
      )}
    </div>
  );
}
