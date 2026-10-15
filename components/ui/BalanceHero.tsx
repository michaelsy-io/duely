import clsx from "clsx";
import type { ReactNode } from "react";

/** Wise-style big balance: label, huge number, sub-line, optional progress and round actions. heroStyle switch in CSS. */
export function BalanceHero({ label, amount, sub, progress, actions, className, top }: {
  label: ReactNode; amount: ReactNode; sub?: ReactNode; progress?: { value: number; label: ReactNode }; actions?: ReactNode; className?: string; top?: ReactNode;
}) {
  return (
    <section className={clsx("balance-hero rounded-card border border-border bg-hero px-5 py-7 text-hero-fg shadow-card sm:px-8 sm:py-9", className)}>
      {top}
      <p className="text-sm font-semibold text-hero-muted">{label}</p>
      <p className="num mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.045em] sm:text-[64px]">{amount}</p>
      {sub && <div className="mt-3 text-sm text-hero-muted">{sub}</div>}
      {progress && (
        <div className="mt-5 w-full max-w-md">
          <div className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-3" role="progressbar" aria-valuenow={Math.round(progress.value * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-pill bg-good" style={{ width: `${Math.max(2, Math.min(100, progress.value * 100))}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-hero-muted">{progress.label}</p>
        </div>
      )}
      {actions && <div className="hero-actions mt-7 flex w-full flex-wrap justify-center gap-2 sm:gap-6">{actions}</div>}
    </section>
  );
}
