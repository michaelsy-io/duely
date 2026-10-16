"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { CalEvent, EventKind, EventTone } from "@/lib/calendar";

export const KIND_COLOR: Record<EventKind, string> = {
  bounced: "var(--bad)",
  missed: "var(--orange)",
  close: "var(--fg)",
  review: "var(--accent)",
  check: "var(--primary)",
  promise: "var(--good)",
  invoice: "var(--warn)",
};

const TONE: Record<EventTone, string> = {
  bad: "bg-bad-soft text-bad-fg",
  warn: "bg-warn-soft text-warn-fg",
  good: "bg-good-soft text-good-fg",
  primary: "bg-primary-soft text-primary-soft-fg",
  orange: "bg-orange-soft text-orange-fg",
  neutral: "bg-surface-2 text-fg-muted",
};

export interface KindMeta { kind: EventKind; label: string; plural: string; href: string }

const PER_GROUP = 4;
const BADGE_AT = 4;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function Dot({ kind, className }: { kind: EventKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: KIND_COLOR[kind], boxShadow: kind === "review" ? "inset 0 0 0 1px color-mix(in oklab, var(--fg) 30%, transparent)" : undefined }}
    />
  );
}

function longDate(iso: string, weekdayIdx: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DAYS_LONG[weekdayIdx]} ${d} ${MONTHS[m - 1]} ${y}`;
}

function groupByKind(events: CalEvent[], kinds: KindMeta[]) {
  return kinds.map((k) => ({ ...k, items: events.filter((e) => e.kind === k.kind) })).filter((g) => g.items.length > 0);
}

interface Props {
  cells: { iso: string; inMonth: boolean }[];
  days: Record<string, CalEvent[]>;
  kinds: KindMeta[];
  today: string;
  closeDate: string | null;
  focusDate: string | null;
  monthLabel: string;
}

type Opener = "hover" | "focus" | "click";

export function MonthCalendar({ cells, days, kinds, today, closeDate, focusDate, monthLabel }: Props) {
  const popId = useId();
  const firstInMonth = cells.find((c) => c.inMonth)!.iso;
  const initial = [focusDate, today].find((d) => d && cells.some((c) => c.inMonth && c.iso === d)) ?? firstInMonth;
  const [active, setActive] = useState<string>(initial);
  const [open, setOpen] = useState<{ iso: string; by: Opener } | null>(null);
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDown = useRef(false);
  const [pos, setPos] = useState<CSSProperties>({ visibility: "hidden" });

  const clearTimer = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  const close = useCallback((refocus = false) => {
    clearTimer();
    setOpen((o) => {
      if (o && refocus) cellRefs.current[o.iso]?.focus({ preventScroll: true });
      return null;
    });
  }, []);

  // Keep the active day in sync when the month (or the requested focus day) changes.
  useEffect(() => { setActive(initial); setOpen(null); }, [initial]);

  // Deep link (?d=): open that day once on arrival.
  useEffect(() => {
    if (focusDate && cells.some((c) => c.inMonth && c.iso === focusDate)) {
      cellRefs.current[focusDate]?.focus({ preventScroll: true });
      setOpen({ iso: focusDate, by: "click" });
    }
  }, [focusDate, cells]);

  // Position the popover next to its day, clamped inside the viewport; flip above when short of room.
  const place = useCallback(() => {
    if (!open) return;
    const cell = cellRefs.current[open.iso];
    const pop = popRef.current;
    if (!cell || !pop) return;
    const r = cell.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const w = Math.min(360, vw - 16);
    const h = pop.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    const below = r.bottom + 8;
    const top = below + h > vh - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : Math.min(below, Math.max(8, vh - h - 8));
    setPos({ left, top, width: w });
  }, [open]);

  useLayoutEffect(() => { place(); }, [place]);
  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (Object.values(cellRefs.current).some((c) => c?.contains(t))) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(true); } };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place, close]);

  useEffect(() => () => clearTimer(), []);

  const scheduleHoverOpen = (iso: string) => {
    clearTimer();
    if (!(days[iso]?.length)) return;
    hoverTimer.current = setTimeout(() => setOpen((o) => (o?.by === "click" ? o : { iso, by: "hover" })), 120);
  };
  const scheduleHoverClose = () => {
    clearTimer();
    hoverTimer.current = setTimeout(() => setOpen((o) => (o?.by === "hover" ? null : o)), 180);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, idx: number) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(idx % 7), End: 6 - (idx % 7) }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    let j = idx + step;
    while (j >= 0 && j < cells.length && !cells[j].inMonth) j += step > 0 ? 1 : -1;
    const target = cells[j];
    if (!target?.inMonth) return;
    setActive(target.iso);
    cellRefs.current[target.iso]?.focus();
  };

  const openEvents = open ? days[open.iso] ?? [] : [];
  const openIdx = open ? cells.findIndex((c) => c.iso === open.iso) : -1;

  return (
    <div className="relative">
      <div role="grid" aria-label={`${monthLabel} calendar`} className="grid grid-cols-7 gap-1 sm:gap-1.5">
        <div role="row" className="contents">
          {WEEKDAYS.map((w) => (
            <span key={w} role="columnheader" className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-fg-subtle sm:text-xs">
              <span className="sm:hidden">{w[0]}</span>
              <span className="hidden sm:inline">{w}</span>
            </span>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <div role="row" className="contents" key={row}>
            {cells.slice(row * 7, row * 7 + 7).map((c, k) => {
              const idx = row * 7 + k;
              const evs = days[c.iso] ?? [];
              const day = Number(c.iso.slice(8));
              if (!c.inMonth) {
                return <span key={c.iso} role="gridcell" aria-hidden="true" className="min-h-[52px] rounded-xl sm:min-h-[92px]" />;
              }
              const kindsHere = kinds.filter((m) => evs.some((e) => e.kind === m.kind));
              const isToday = c.iso === today;
              const isClose = c.iso === closeDate;
              const alarm = evs.some((e) => e.kind === "bounced" || e.kind === "missed");
              const isOpen = open?.iso === c.iso;
              const counts = kindsHere.map((m) => ({ kind: m.kind, n: evs.filter((e) => e.kind === m.kind).length }));
              const summary = evs.length ? counts.map((x) => { const m = kinds.find((k2) => k2.kind === x.kind)!; return `${x.n} ${(x.n > 1 ? m.plural : m.label).toLowerCase()}`; }).join(", ") : "nothing scheduled";
              return (
                <span role="gridcell" key={c.iso} className="contents">
                  <button
                    ref={(el) => { cellRefs.current[c.iso] = el; }}
                    type="button"
                    tabIndex={c.iso === active ? 0 : -1}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? popId : undefined}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${longDate(c.iso, k)}${isToday ? " (today)" : ""}: ${summary}`}
                    onPointerDown={() => { pointerDown.current = true; }}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") scheduleHoverOpen(c.iso); }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleHoverClose(); }}
                    onFocus={() => {
                      setActive(c.iso);
                      if (pointerDown.current) { pointerDown.current = false; return; } // tap/click handles it
                      setOpen({ iso: c.iso, by: "focus" });
                    }}
                    onClick={() => {
                      pointerDown.current = false;
                      clearTimer();
                      setOpen((o) => (o?.iso === c.iso && o.by === "click" ? null : { iso: c.iso, by: "click" }));
                    }}
                    onKeyDown={(e) => onKeyDown(e, idx)}
                    className={clsx(
                      "group relative flex min-h-[52px] min-w-0 flex-col items-stretch rounded-xl border p-1 text-left transition-colors sm:min-h-[92px] sm:p-2",
                      alarm ? "border-transparent bg-bad-soft/60" : evs.length ? "border-border bg-surface" : "border-transparent bg-surface-2/60",
                      isClose && "ring-2 ring-inset ring-primary/60",
                      isOpen ? "border-primary bg-primary-soft" : "hover:border-primary/40 hover:bg-surface-2",
                    )}
                  >
                    <span className={clsx("num grid size-5 place-items-center rounded-full text-[11px] font-bold sm:size-7 sm:text-sm", isToday ? "bg-primary text-primary-fg" : "text-fg")}>{day}</span>
                    {evs.length >= BADGE_AT && (
                      <span className="num absolute right-0.5 top-0.5 min-w-[16px] rounded-pill bg-fg px-1 text-center text-[10px] font-bold leading-4 text-bg sm:right-1.5 sm:top-1.5 sm:px-1.5 sm:text-[11px]" aria-hidden="true">{evs.length}</span>
                    )}
                    {evs.length > 0 && (
                      <span className="mt-auto flex flex-wrap items-center gap-0.5 pt-1 sm:gap-x-2 sm:gap-y-1" aria-hidden="true">
                        {counts.map((x) => (
                          <span key={x.kind} className="flex items-center gap-0.5">
                            <Dot kind={x.kind} className="size-1.5 sm:size-2" />
                            <span className="num hidden text-[11px] font-bold text-fg-muted sm:inline">{x.n}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    {isClose && <span className="mt-0.5 hidden truncate text-[10px] font-bold uppercase tracking-wide text-primary sm:block" aria-hidden="true">Close</span>}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key={open.iso}
            ref={popRef}
            id={popId}
            role="dialog"
            aria-label={`What's in store on ${longDate(open.iso, openIdx % 7)}`}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") clearTimer(); }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleHoverClose(); }}
            style={{ position: "fixed", zIndex: 40, ...pos }}
            className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain rounded-card border border-border bg-surface p-2 shadow-float"
          >
            <div className="flex items-start justify-between gap-2 px-3 pb-2 pt-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{longDate(open.iso, openIdx % 7)}</p>
                <p className="text-xs text-fg-muted">
                  {open.iso === today ? "Today (demo clock) · " : ""}
                  {openEvents.length === 0 ? "Nothing scheduled" : `${openEvents.length} item${openEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <span className="flex items-center gap-1.5">
                {openEvents.length >= BADGE_AT && <span className="num rounded-pill bg-fg px-2 py-0.5 text-[11px] font-bold text-bg">{openEvents.length}</span>}
                <button type="button" onClick={() => close(true)} aria-label="Close" className="grid size-8 place-items-center rounded-full text-fg-muted hover:bg-surface-2">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </span>
            </div>
            {openEvents.length === 0 && <p className="px-3 pb-3 text-sm text-fg-muted">No checks, invoices, promises or reviews fall on this day.</p>}
            {groupByKind(openEvents, kinds).map((g) => (
              <section key={g.kind} className="border-t border-border px-1 pt-2 pb-1">
                <h3 className="flex items-center gap-2 px-2 pb-1 text-xs font-bold uppercase tracking-wider text-fg-subtle">
                  <Dot kind={g.kind} />
                  {g.items.length > 1 ? g.plural : g.label}
                  <span className="num rounded-pill bg-surface-3 px-1.5 text-[11px] text-fg-muted">{g.items.length}</span>
                </h3>
                <ul>
                  {g.items.slice(0, PER_GROUP).map((e, i) => (
                    <li key={i}>
                      <Link href={e.href} className="flex items-start gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2 focus-visible:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{e.title}</span>
                          <span className="line-clamp-2 text-xs text-fg-muted">{e.detail}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                          {e.amountText && <span className="num text-sm font-extrabold">{e.amountText}</span>}
                          <span className={clsx("whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-bold", TONE[e.tone])}>{e.status}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.items.length > PER_GROUP && (
                  <Link href={g.href} className="block px-2 pb-1 text-xs font-bold text-primary hover:underline">+{g.items.length - PER_GROUP} more</Link>
                )}
              </section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
