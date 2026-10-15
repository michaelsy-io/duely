"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import clsx from "clsx";

export interface ClientItem {
  code: string; name: string; initials: string; bg: string; fg: string; segment: string; collector: string; area: string;
  balance: string; overdue: string | null; overdueDays: number | null; rank: number | null; tone: string;
}

const SEGMENTS = ["All", "Hospital", "Eye clinic", "Optical shop", "Ambulatory surgical center"];

export function ClientSearch({ items }: { items: ClientItem[] }) {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState("All");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((c) =>
      (seg === "All" || c.segment === seg) &&
      (!onlyOverdue || c.overdue) &&
      (!s || c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || c.area.toLowerCase().includes(s) || c.collector.toLowerCase().includes(s)),
    );
  }, [items, q, seg, onlyOverdue]);

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <label htmlFor="client-q" className="sr-only">Search clients</label>
        <input id="client-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, area or collector" className="input min-h-[52px] pl-12 text-[15px]" />
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {SEGMENTS.map((s) => (
          <button key={s} type="button" aria-pressed={seg === s} onClick={() => setSeg(s)} className={clsx("min-h-[40px] shrink-0 rounded-pill px-4 text-sm font-bold", seg === s ? "bg-fg text-bg" : "border border-border bg-surface hover:bg-surface-2")}>
            {s === "Ambulatory surgical center" ? "Surgical centers" : s}
          </button>
        ))}
        <button type="button" aria-pressed={onlyOverdue} onClick={() => setOnlyOverdue((v) => !v)} className={clsx("min-h-[40px] shrink-0 rounded-pill px-4 text-sm font-bold", onlyOverdue ? "bg-accent text-accent-fg" : "border border-border bg-surface hover:bg-surface-2")}>
          Overdue only
        </button>
      </div>
      <p className="mb-2 text-sm text-fg-muted" aria-live="polite">{shown.length} of {items.length} clients</p>
      {shown.length === 0 ? (
        <div className="card px-6 py-12 text-center text-fg-muted">No clients match “{q}”.</div>
      ) : (
        <div className="list-group" role="list">
          {shown.map((c) => (
            <Link key={c.code} href={`/clients/${c.code}`} role="listitem" className="pad-y flex items-center gap-3 px-4 transition-colors hover:bg-surface-2 sm:px-5">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-avatar text-[15px] font-bold" style={{ background: c.bg, color: c.fg }}>{c.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{c.name}</span>
                <span className="block truncate text-[13px] text-fg-muted">{c.code} · {c.segment} · {c.area} · {c.collector}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className="num text-[15px] font-extrabold">{c.balance}</span>
                {c.overdue ? (
                  <span className={clsx("num rounded-pill px-2 py-0.5 text-[11px] font-bold", c.tone)}>{c.overdue} overdue</span>
                ) : (
                  <span className="rounded-pill bg-good-soft px-2 py-0.5 text-[11px] font-bold text-good-fg">Up to date</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
