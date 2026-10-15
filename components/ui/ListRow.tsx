import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Clean list row: leading (avatar), title + grey sub-label, trailing (amount/chips).
 * Wrap rows in <ListGroup>; the theme's listStyle decides rows vs separate cards.
 */
export function ListRow({ leading, title, sub, meta, trailing, trailingSub, href, className }: {
  leading?: ReactNode; title: ReactNode; sub?: ReactNode; meta?: ReactNode; trailing?: ReactNode; trailingSub?: ReactNode; href?: string; className?: string;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-fg">{title}</span>
        {sub && <span className="block truncate text-[13px] text-fg-muted">{sub}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      {(trailing || trailingSub) && (
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          {trailing && <span className="num text-[15px] font-extrabold text-fg">{trailing}</span>}
          {trailingSub}
        </span>
      )}
    </>
  );
  const cls = clsx("pad-y flex items-center gap-3 px-4 sm:px-5", className);
  return href ? (
    <Link href={href} className={clsx(cls, "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ListGroup({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={clsx("list-group", className)} role="list" aria-label={label}>
      {children}
    </div>
  );
}
