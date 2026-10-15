"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { NAV } from "./nav";

export function Sidebar({ periodLabel, source }: { periodLabel: string; source: string }) {
  const path = usePathname();
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-nav px-4 py-6">
      <Link href="/today" className="mb-8 px-3" aria-label="Duely home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-[44px] items-center gap-3 rounded-pill px-4 text-[15px] font-semibold transition-colors",
                active ? "bg-nav-active text-nav-active-fg" : "text-nav-fg hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
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
