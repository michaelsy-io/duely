"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import { Ellipsis } from "lucide-react";
import type { Role } from "@/lib/session";
import { isActive, tabsFor, type NavItem } from "./nav";

const tabClass = (active: boolean) =>
  clsx("flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[12px] font-semibold", active ? "text-primary" : "text-nav-fg");

function TabIcon({ item, active }: { item: Pick<NavItem, "icon">; active: boolean }) {
  const Icon = item.icon;
  return (
    <span className={clsx("relative grid h-7 w-12 place-items-center rounded-pill transition-colors", active && "text-nav-active-fg")}>
      {active && (
        <motion.span
          layoutId="tabs-active"
          aria-hidden="true"
          className="absolute inset-0 rounded-pill bg-nav-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className="relative size-5" aria-hidden="true" />
    </span>
  );
}

export function BottomTabs({ role }: { role: Role }) {
  const path = usePathname();
  const { tabs, more } = tabsFor(role);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const moreActive = more.some((m) => isActive(path, m.href));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref}>
      {open && (
        <div id="more-menu" role="menu" aria-label="More pages" className="anim-fade app-bottomtabs fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex-col rounded-card border border-border bg-surface p-2 shadow-float">
          {more.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} role="menuitem" aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={clsx("flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold hover:bg-surface-2", active ? "bg-nav-active text-nav-active-fg" : "text-fg")}>
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
      <nav aria-label="Main" className="app-bottomtabs fixed inset-x-0 bottom-0 z-30 justify-around gap-1 border-t border-border bg-nav px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
        {tabs.map((item) => {
          const active = isActive(path, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <TabIcon item={item} active={active} />
              {item.short}
            </Link>
          );
        })}
        {more.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="more-menu"
            aria-haspopup="menu"
            aria-label={`More: ${more.map((m) => m.label).join(", ")}`}
            className={tabClass(moreActive || open)}
          >
            <TabIcon item={{ icon: Ellipsis }} active={moreActive} />
            More
          </button>
        )}
      </nav>
    </div>
  );
}
