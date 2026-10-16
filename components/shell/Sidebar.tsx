"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import type { Role } from "@/lib/session";
import { isActive, navFor } from "./nav";

export function Sidebar({ periodLabel, source, role }: { periodLabel: string; source: string; role: Role }) {
  const path = usePathname();
  const items = navFor(role);
  const activeIndex = items.findIndex((n) => isActive(path, n.href));
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-nav px-4 py-6">
      <Link href={items[0].href} className="mb-8 px-3" aria-label="Duely home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="relative flex flex-col gap-1">
        {/* One pill that slides by row index (44px row + 4px gap). A shared layoutId measured against the
            scrolled page and flew in from below, so the position is computed instead. */}
        {activeIndex >= 0 && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[44px] rounded-pill bg-nav-active"
            initial={false}
            animate={{ y: activeIndex * 48 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex min-h-[44px] items-center gap-3 rounded-pill px-4 text-[15px] font-semibold transition-colors",
                active ? "text-nav-active-fg" : "text-nav-fg hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="relative size-5" aria-hidden="true" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-card bg-surface-2 p-4 text-xs text-fg-muted">
        <p className="font-bold text-fg">Demo data</p>
        <p className="mt-1">Books as of {periodLabel}. Client names are fictional.</p>
        {source === "mock" && <p className="mt-1 text-warn-fg">Engine not connected: showing sample figures.</p>}
      </div>
    </aside>
  );
}
