import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { FollowUpRow } from "@/lib/engine/types";
import { bucketTone, peso } from "@/lib/format";
import { STEP_TONE, type NextStep } from "@/lib/view";
import { Avatar, PriorityChip, toneClass } from "@/components/ui";
import { dayWord, topFactors } from "./why";

export type RowAction = { label: NextStep; href: string; external?: boolean; icon: ReactNode; title: string };

/**
 * One client on Today's work queue: rank, name, the top two point reasons, the overdue amount and one action.
 * Everything else (code, segment, collector, days overdue, priority score, full points ledger) folds into "Details".
 */
export function FollowUpItem({ row, name, rank, overallRank, showCollector, action }: {
  row: FollowUpRow; name: string; rank: number; overallRank?: number; showCollector: boolean; action: RowAction;
}) {
  const why = topFactors(row);
  const days = row.oldestDays === 1 ? "1 day" : `${row.oldestDays} days`;
  const actionCls = clsx("btn btn-sm relative z-10 gap-1.5 [&_svg]:size-4", toneClass(STEP_TONE[action.label]));

  return (
    <div className="relative flex items-start gap-3 px-4 pad-y transition-colors has-[>div>a:hover]:bg-surface-2 sm:px-5">
      <span className="relative mt-0.5 shrink-0">
        <Avatar code={row.client_code} size={40} />
        <span
          className="num absolute -bottom-1.5 -left-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-surface bg-fg px-1 text-xs font-bold leading-none text-bg"
          title={overallRank ? `#${rank} on your list, #${overallRank} company-wide` : `#${rank} on today's list`}
        >
          {rank}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <Link href={`/clients/${row.client_code}`} className="block truncate rounded-md text-[15px] font-bold text-fg after:absolute after:inset-0 after:content-['']">
          {name}
        </Link>
        <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
          <span className="sr-only">Why: </span>
          {why.map((f, i) => (
            <span key={i}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <b className="num font-bold text-fg">+{f.points}</b> {f.label}
            </span>
          ))}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3">
          {overallRank !== undefined && <span className="num text-xs text-fg-muted">#{overallRank} overall</span>}
          <details className="group relative z-10 open:basis-full">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md text-xs font-bold text-primary hover:underline [&::-webkit-details-marker]:hidden">
              Details
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mb-1 mt-1 max-w-md rounded-2xl bg-surface-2 p-3 text-xs">
              <p className="text-fg-muted">{row.client_code} · {row.segment}{showCollector && <> · {row.collector}</>}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`num whitespace-nowrap rounded-pill px-2 py-0.5 text-xs font-bold ${bucketTone(row.oldestDays)}`}
                  title={`Oldest unpaid invoice is ${days} past due`}
                  aria-label={`Oldest unpaid invoice is ${days} past due`}
                >
                  {row.oldestDays}d overdue
                </span>
                <PriorityChip score={row.score} />
              </div>
              <p className="mt-2 font-semibold text-fg-muted">Points from the rules engine. Higher means call sooner.</p>
              <ul className="mt-1 flex flex-col gap-1">
                {row.factors.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">{dayWord(f.label)}</span>
                    <span className={`num shrink-0 font-extrabold ${f.points < 0 ? "text-good-fg" : "text-fg"}`}>{f.points > 0 ? "+" : ""}{f.points}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-border pt-1 font-bold">
                  <span>Priority score</span><span className="num">{row.score}</span>
                </li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <span className="num text-[15px] font-extrabold text-fg">{peso(row.overdue)}</span>
        {action.external ? (
          <a href={action.href} className={actionCls} title={action.title} aria-label={`${action.label}: ${name}`}>{action.icon}{action.label}</a>
        ) : (
          <Link href={action.href} className={actionCls} title={action.title} aria-label={`${action.label}: ${name}`}>{action.icon}{action.label}</Link>
        )}
      </div>
    </div>
  );
}
