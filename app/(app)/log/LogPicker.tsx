"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, NotebookPen, Search } from "lucide-react";
import { AnimatedList } from "@/components/motion/AnimatedList";
import { LogContactForm } from "@/components/client/LogContact";

export interface LogClient {
  code: string; name: string; area: string; segment: string; initials: string; bg: string; fg: string;
  overdue: string | null; overdueDays: number | null; rank: number | null; tone: string;
}

/** Keep ?c= in the address bar in step with the picked client, without a server round trip. */
function syncUrl(code: string | null) {
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set("c", code);
    else url.searchParams.delete("c");
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* the address bar is a convenience only */
  }
}

function Swatch({ c, size = 44 }: { c: LogClient; size?: number }) {
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-avatar text-[15px] font-bold" style={{ width: size, height: size, background: c.bg, color: c.fg }}>
      {c.initials}
    </span>
  );
}

/**
 * Client picker plus inline log form. Desktop: list on the left, form on the right.
 * Phones: the list, then the form in its place with a "Change client" button.
 */
export function LogPicker({ items, initial, period, by }: { items: LogClient[]; initial: string | null; period: string; by: string }) {
  const [q, setQ] = useState("");
  const [code, setCode] = useState<string | null>(initial);
  // Bumped on "Log another" so picking the same client again starts a fresh form.
  const [round, setRound] = useState(0);
  const selected = items.find((c) => c.code === code) ?? null;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || c.area.toLowerCase().includes(s));
  }, [items, q]);

  function pick(next: string) {
    setCode(next);
    syncUrl(next);
    // On phones the form replaces the list, so bring its top into view.
    if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0 });
  }

  function clear() {
    setCode(null);
    setRound((n) => n + 1);
    syncUrl(null);
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-6">
      <section aria-label="Pick a client" className={clsx(selected && "hidden lg:block")}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <label htmlFor="log-q" className="sr-only">Search clients</label>
          <input id="log-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code or area" className="input min-h-[52px] pl-12 text-[15px]" />
        </div>
        <p className="mb-2 text-sm text-fg-muted" aria-live="polite">{shown.length} of {items.length} clients</p>
        {shown.length === 0 ? (
          <div className="card px-6 py-12 text-center text-fg-muted">No clients match “{q}”.</div>
        ) : (
          <AnimatedList className="list-group" label="Clients">
            {shown.map((c) => {
              const active = c.code === code;
              return (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(c.code)}
                  className={clsx("pad-y flex w-full items-center gap-3 px-4 text-left transition-colors sm:px-5", active ? "bg-primary-soft" : "hover:bg-surface-2")}
                >
                  <Swatch c={c} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{c.name}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{c.code} · {c.area}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                    {c.overdue ? (
                      <>
                        <span className="num text-[15px] font-extrabold">{c.overdue}</span>
                        <span className={clsx("num rounded-pill px-2 py-0.5 text-[11px] font-bold", c.tone)}>{c.overdueDays}d overdue</span>
                      </>
                    ) : (
                      <span className="rounded-pill bg-good-soft px-2 py-0.5 text-[11px] font-bold text-good-fg">Up to date</span>
                    )}
                  </span>
                </button>
              );
            })}
          </AnimatedList>
        )}
      </section>

      <section aria-label="Log contact form" className={clsx("lg:sticky lg:top-24", !selected && "hidden lg:block")}>
        {selected ? (
          <div className="anim-fade flex flex-col gap-3">
            <button type="button" onClick={clear} className="btn btn-ghost btn-sm -ml-2 self-start lg:hidden"><ArrowLeft className="size-4" aria-hidden="true" />Change client</button>
            <div className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Swatch c={selected} size={52} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-xl font-extrabold tracking-tight">{selected.name}</h2>
                  <p className="truncate text-sm text-fg-muted">
                    {selected.code} · {selected.overdue ? <span className="num">{selected.overdue} overdue, {selected.overdueDays}d</span> : "Up to date"}
                  </p>
                </div>
              </div>
              <LogContactForm
                key={`${selected.code}-${round}`}
                code={selected.code}
                period={period}
                by={by}
                onDone={clear}
                doneLabel="Log another"
                secondary={<Link href={`/clients/${selected.code}`} className="btn btn-secondary">Open client</Link>}
              />
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><NotebookPen className="size-6" aria-hidden="true" /></span>
            <p className="font-display text-xl font-extrabold">Pick a client</p>
            <p className="max-w-xs text-sm text-fg-muted">Choose someone from the list to log a call, SMS, email or visit.</p>
          </div>
        )}
      </section>
    </div>
  );
}
