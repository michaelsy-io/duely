import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { toneClass, type Tone } from "./Chip";

/**
 * Small tile: icon + value + label. Optional link.
 * `dense`: for a row of three on a phone (icon hidden below sm, label may wrap to two lines).
 * `current`: the list below is filtered by this tile.
 */
export function StatPill({ icon, value, label, tone = "primary", href, dense, current }: {
  icon?: ReactNode; value: ReactNode; label: string; tone?: Tone; href?: string; dense?: boolean; current?: boolean;
}) {
  const body = (
    <>
      {icon && <span className={clsx("size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5", dense ? "hidden sm:grid" : "grid", toneClass(tone))}>{icon}</span>}
      <span className="min-w-0">
        <span className={clsx("num block font-extrabold leading-tight text-fg", dense ? "text-base sm:text-lg" : "text-lg")}>{value}</span>
        <span className={clsx("block text-xs font-medium text-fg-muted", dense ? "line-clamp-2 sm:line-clamp-none sm:truncate" : "truncate")}>{label}</span>
      </span>
    </>
  );
  const cls = clsx(
    "card flex items-center gap-3 transition-colors",
    dense ? "min-h-[56px] px-3 py-2.5 sm:min-h-[64px] sm:px-4 sm:py-3" : "min-h-[64px] px-4 py-3",
    current && "ring-2 ring-fg",
  );
  return href ? (
    <Link href={href} aria-current={current ? "true" : undefined} className={clsx(cls, "hover:bg-surface-2")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
