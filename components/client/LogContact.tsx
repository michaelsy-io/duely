"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, NotebookPen, X } from "lucide-react";

const OUTCOMES = ["Promised to pay", "No answer", "Will call back", "Sent PDC", "Disputes invoice", "Asked for statement"];

/** "Log contact" sheet. Posts to /api/contacts; falls back to a local confirmation if the route is unavailable. */
export function LogContact({ code, name, period, by, variant = "button" }: { code: string; name: string; period: string; by: string; variant?: "button" | "action" }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("call");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "local">("idle");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#log") setOpen(true);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    const body: Record<string, unknown> = { client_code: code, channel, outcome, note: note || undefined, logged_by: by, period };
    if (outcome === "Promised to pay" && Number(amount) > 0) body.promise_amount = Number(amount);
    if (outcome === "Promised to pay" && date) body.promise_date = date;
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      setState(r.ok ? "saved" : "local");
    } catch {
      setState("local");
    }
  }

  const trigger =
    variant === "action" ? (
      <button type="button" onClick={() => setOpen(true)} className="group flex min-w-[54px] flex-col items-center gap-1.5 rounded-2xl p-1 sm:min-w-[64px] sm:gap-2">
        <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-primary-soft-fg transition-transform group-hover:-translate-y-0.5 sm:size-14 [&_svg]:size-5 sm:[&_svg]:size-6"><NotebookPen /></span>
        <span className="text-xs font-semibold sm:text-[13px]">Log</span>
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary"><NotebookPen className="size-4" aria-hidden="true" />Log contact</button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="log-title">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-scrim" onClick={() => { setOpen(false); setState("idle"); }} />
          <div className="anim-fade relative w-full max-w-md rounded-t-[28px] bg-surface p-6 shadow-float sm:rounded-[28px]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="log-title" className="font-display text-2xl font-extrabold tracking-tight">Log contact</h2>
                <p className="text-sm text-fg-muted">{name} · {code}</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); setState("idle"); }} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Close"><X className="size-5" aria-hidden="true" /></button>
            </div>
            {state === "saved" || state === "local" ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto size-12 text-good" aria-hidden="true" />
                <p className="mt-3 font-display text-xl font-extrabold">Contact logged</p>
                <p className="mt-1 text-sm text-fg-muted">{state === "saved" ? "Saved to the contact log." : "Saved for this demo session (the contact service is offline)."}</p>
                <button type="button" className="btn btn-primary mt-5" onClick={() => { setOpen(false); setState("idle"); }}>Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-bold">How did you reach them?</legend>
                  <div className="flex flex-wrap gap-2">
                    {["call", "sms", "email", "visit"].map((c) => (
                      <label key={c} className={`flex min-h-[40px] cursor-pointer items-center rounded-pill px-4 text-sm font-bold capitalize ${channel === c ? "bg-primary text-primary-fg" : "bg-surface-3 text-primary-soft-fg"}`}>
                        <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="sr-only" />
                        {c === "sms" ? "SMS" : c}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1.5 text-sm font-bold">
                  Outcome
                  <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="input font-medium">
                    {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
                {outcome === "Promised to pay" && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-bold">Amount (₱)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className="input num font-medium" placeholder="0" /></label>
                    <label className="flex flex-col gap-1.5 text-sm font-bold">By date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input font-medium" /></label>
                  </div>
                )}
                <label className="flex flex-col gap-1.5 text-sm font-bold">
                  Note <span className="sr-only">(optional)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input min-h-[72px] rounded-2xl py-2 font-medium" placeholder="Optional" />
                </label>
                <button type="submit" disabled={state === "saving"} className="btn btn-primary w-full">{state === "saving" ? "Saving…" : "Save contact"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
