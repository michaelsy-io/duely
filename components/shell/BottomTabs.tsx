"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV } from "./nav";

export function BottomTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="app-bottomtabs fixed inset-x-0 bottom-0 z-30 justify-around border-t border-border bg-nav px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
      {NAV.filter((n) => n.tab).map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx("flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold", active ? "text-primary" : "text-nav-fg")}
          >
            <span className={clsx("grid h-7 w-12 place-items-center rounded-pill transition-colors", active && "bg-nav-active text-nav-active-fg")}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {label.replace(" view", "")}
          </Link>
        );
      })}
    </nav>
  );
}
