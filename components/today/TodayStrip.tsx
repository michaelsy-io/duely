import Link from "next/link";
import type { ReactNode } from "react";
import { NotebookPen, Phone } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { PesoCoins } from "@/components/brand/PesoCoins";
import { peso } from "@/lib/format";

/** Compact summary above Today's list: overdue total, how much is already covered, and who to call first.
 *  Dressed like the landing hero: a soft purple glow (.brand-hero) and two floating peso coins. */
export function TodayStrip({ who, totalOverdue, covered, first, callHref, logHref }: {
  who: string;
  totalOverdue: number;
  covered: number;
  first?: { code: string; name: string; amount: number };
  /** tel: link, only for the collecting agent who actually makes the call. */
  callHref?: string;
  logHref?: string;
}) {
  const share = totalOverdue ? covered / totalOverdue : 0;
  const pctText = `${Math.round(share * 100)}%`;
  return (
    <section aria-label="Summary" className="card brand-hero grid gap-4 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8 sm:px-6 sm:py-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
      <PesoCoins />
      <div>
        <p className="text-xs font-semibold text-fg-muted">Overdue in {who}</p>
        <p className="num mt-0.5 font-display text-[32px] font-extrabold leading-none tracking-[-0.04em] sm:text-[40px]">
          <CountUp value={totalOverdue} text={peso(totalOverdue)} format="peso" />
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-sm"><b className="num font-extrabold">{pctText}</b> <span className="text-fg-muted">already covered</span></p>
        <div className="mt-1.5 h-2 w-full max-w-sm overflow-hidden rounded-pill bg-surface-3" role="progressbar" aria-label="Overdue covered by checks on hand and promises" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="grow-x h-full rounded-pill bg-good" style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-fg-muted"><span className="num">{peso(covered)}</span> by checks on hand and promises</p>
      </div>

      {first && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="min-w-0 text-sm">
            <span className="block text-xs font-semibold text-fg-muted">First call</span>
            <Link href={`/clients/${first.code}`} className="font-bold text-fg underline-offset-2 hover:underline">{first.name}</Link>
            <span className="num text-fg-muted">, {peso(first.amount)}</span>
          </p>
          {(callHref || logHref) && (
            <div className="flex gap-2">
              {callHref && <StripButton href={callHref} external primary icon={<Phone />}>Call</StripButton>}
              {logHref && <StripButton href={logHref} icon={<NotebookPen />}>Log contact</StripButton>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StripButton({ href, external, primary, icon, children }: { href: string; external?: boolean; primary?: boolean; icon: ReactNode; children: ReactNode }) {
  const cls = `btn btn-sm gap-1.5 [&_svg]:size-4 ${primary ? "btn-primary" : "btn-secondary"}`;
  return external ? <a href={href} className={cls}>{icon}{children}</a> : <Link href={href} className={cls}>{icon}{children}</Link>;
}
