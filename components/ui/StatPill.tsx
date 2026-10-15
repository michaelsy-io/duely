import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { toneClass, type Tone } from "./Chip";

/** Small tile: icon + value + label. Optional link. */
export function StatPill({ icon, value, label, tone = "primary", href }: { icon?: ReactNode; value: ReactNode; label: string; tone?: Tone; href?: string }) {
  const body = (
    <>
      {icon && <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5", toneClass(tone))}>{icon}</span>}
      <span className="min-w-0">
        <span className="num block text-lg font-extrabold leading-tight text-fg">{value}</span>
        <span className="block truncate text-xs font-medium text-fg-muted">{label}</span>
      </span>
    </>
  );
  const cls = "card flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors";
  return href ? (
    <Link href={href} className={clsx(cls, "hover:bg-surface-2")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
