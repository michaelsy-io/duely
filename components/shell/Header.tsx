"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Bell, CalendarDays, Check, ChevronDown, LogOut, Palette, Upload, UserRound } from "lucide-react";
import { setPeriod, setTheme, signOut, switchRole } from "@/app/actions";
import { LogoMark } from "@/components/Logo";

export interface Notice { id: string; title: string; body: string; href: string; tone: "bad" | "warn" | "good" | "primary" }

interface Props {
  greeting: string;
  name: string;
  role: string;
  /** "P1" / "P2", or a month key ("2026-10") for a month with no imported data. */
  selected: string;
  periods: { id: "P1" | "P2"; short: string }[];
  /** Months the user can open; value is what setPeriod receives. */
  months: { value: string; label: string; short: string; note: string }[];
  themes: { name: string; label: string }[];
  theme: string;
  notices: Notice[];
}

const ROLE_OPTIONS = [
  { id: "collector", label: "Collector 2" },
  { id: "supervisor", label: "Supervisor" },
  { id: "cfo", label: "CFO" },
  { id: "admin", label: "Admin" },
];

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

export function Header({ greeting, name, role, selected, periods, months, themes, theme, notices }: Props) {
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [monthMenu, setMonthMenu] = useState(false);
  const monthRef = useOutside<HTMLDivElement>(monthMenu, () => setMonthMenu(false));
  const otherMonth = months.find((m) => m.value === selected && !periods.some((p) => p.id === selected));
  const menuRef = useOutside<HTMLDivElement>(menu, () => setMenu(false));
  const bellRef = useOutside<HTMLDivElement>(bell, () => setBell(false));

  return (
    <header className={clsx("sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md transition-opacity", pending && "opacity-70")}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/today" className="hidden sm:block lg:hidden" aria-label="Duely home"><LogoMark size={34} /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-fg-muted sm:text-sm">{greeting}</p>
          <p className="truncate font-display text-lg font-extrabold leading-tight tracking-tight sm:text-xl">{name}</p>
        </div>

        <div className="relative" ref={monthRef}>
          <div className="flex items-center gap-1 rounded-pill bg-surface-3 p-1" role="group" aria-label="Books as of">
            <span className="hidden pl-2.5 pr-1 text-xs font-semibold text-fg-muted sm:inline">As of</span>
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected === p.id}
                onClick={() => start(() => setPeriod(p.id))}
                className={clsx("min-h-[36px] rounded-pill px-2.5 text-xs font-bold transition-colors sm:px-3 sm:text-sm", selected === p.id ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
              >
                {p.short}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMonthMenu((v) => !v)}
              aria-expanded={monthMenu}
              aria-haspopup="menu"
              aria-pressed={!!otherMonth}
              aria-label={otherMonth ? `Month: ${otherMonth.label} (no data yet). Choose another month` : "Choose another month"}
              className={clsx("flex min-h-[36px] min-w-[36px] items-center justify-center gap-1 rounded-pill px-2 text-xs font-bold transition-colors sm:text-sm", otherMonth ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
            >
              {otherMonth ? <span>{otherMonth.short}</span> : <CalendarDays className="size-4" aria-hidden="true" />}
              <ChevronDown className="hidden size-3.5 sm:block" aria-hidden="true" />
            </button>
          </div>
          {monthMenu && (
            <div role="menu" aria-label="Months" className="anim-fade z-30 rounded-card max-sm:fixed max-sm:inset-x-4 max-sm:top-[68px] sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[280px] border border-border bg-surface p-2 shadow-float">
              <p className="px-3 pb-1 pt-2 eyebrow">Open month</p>
              {months.map((m) => (
                <button
                  key={m.value}
                  role="menuitemradio"
                  aria-checked={selected === m.value}
                  type="button"
                  onClick={() => start(async () => { await setPeriod(m.value); setMonthMenu(false); })}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-3 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className={clsx("block text-xs", m.note.startsWith("Books") ? "text-good-fg" : "text-fg-subtle")}>{m.note}</span>
                  </span>
                  {selected === m.value && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              ))}
              <Link href="/calendar" onClick={() => setMonthMenu(false)} className="mt-1 flex min-h-[44px] items-center gap-2 rounded-2xl border-t border-border px-3 text-sm font-semibold text-primary hover:bg-surface-2">
                <CalendarDays className="size-4" aria-hidden="true" /> Open calendar
              </Link>
            </div>
          )}
        </div>

        <div className="relative" ref={bellRef}>
          <button type="button" onClick={() => setBell((v) => !v)} aria-expanded={bell} aria-label={`Notifications (${notices.length})`} className="relative grid size-11 place-items-center rounded-full bg-surface hover:bg-surface-2 border border-border">
            <Bell className="size-5" aria-hidden="true" />
            {notices.length > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{notices.length}</span>}
          </button>
          {bell && (
            <div className="anim-fade absolute right-0 top-full mt-2 w-[min(92vw,360px)] rounded-card border border-border bg-surface p-2 shadow-float">
              <p className="px-3 pb-1 pt-2 text-sm font-bold">Notifications</p>
              {notices.length === 0 && <p className="px-3 py-4 text-sm text-fg-muted">You are all caught up.</p>}
              {notices.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => setBell(false)} className="flex gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-2">
                  <span className={clsx("mt-1.5 size-2.5 shrink-0 rounded-full", { bad: "bg-bad", warn: "bg-warn", good: "bg-good", primary: "bg-primary" }[n.tone])} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{n.title}</span>
                    <span className="block text-xs text-fg-muted">{n.body}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" aria-label={`Account: ${role}`} className="flex min-h-[44px] items-center gap-2 rounded-pill border border-border bg-surface px-1.5 hover:bg-surface-2 sm:pr-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-fg"><UserRound className="size-4" aria-hidden="true" /></span>
            <span className="hidden text-sm font-bold sm:inline">{role}</span>
            <ChevronDown className="hidden size-4 text-fg-muted sm:block" aria-hidden="true" />
          </button>
          {menu && (
            <div role="menu" className="anim-fade absolute right-0 top-full mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-float">
              <p className="px-3 pb-1 pt-2 eyebrow">View as</p>
              {ROLE_OPTIONS.map((r) => (
                <button key={r.id} role="menuitemradio" aria-checked={role === r.label} type="button" onClick={() => start(async () => { await switchRole(r.id); setMenu(false); })} className="flex min-h-[44px] w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-semibold hover:bg-surface-2">
                  {r.label}
                  {role === r.label && <Check className="size-4 text-primary" aria-hidden="true" />}
                </button>
              ))}
              <p className="mt-1 flex items-center gap-1.5 border-t border-border px-3 pb-1 pt-3 eyebrow"><Palette className="size-3.5" aria-hidden="true" />App style</p>
              {themes.map((t) => (
                <button key={t.name} role="menuitemradio" aria-checked={theme === t.name} type="button" onClick={() => start(async () => { await setTheme(t.name); setMenu(false); })} className="flex min-h-[44px] w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-semibold hover:bg-surface-2">
                  {t.label}
                  {theme === t.name && <Check className="size-4 text-primary" aria-hidden="true" />}
                </button>
              ))}
              <Link href="/calendar" onClick={() => setMenu(false)} className="mt-1 flex min-h-[44px] items-center gap-2 rounded-2xl border-t border-border px-3 text-sm font-semibold hover:bg-surface-2 lg:hidden">
                <CalendarDays className="size-4" aria-hidden="true" /> Calendar
              </Link>
              <Link href="/import" onClick={() => setMenu(false)} className="flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold hover:bg-surface-2 lg:hidden">
                <Upload className="size-4" aria-hidden="true" /> Import files
              </Link>
              <form action={signOut} className="mt-1 border-t border-border pt-1">
                <button type="submit" className="flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 text-left text-sm font-semibold text-bad-fg hover:bg-bad-soft">
                  <LogOut className="size-4" aria-hidden="true" /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
