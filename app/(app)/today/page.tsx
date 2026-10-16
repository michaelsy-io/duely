import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CalendarCheck2, MessageCircle, NotebookPen, Phone, PhoneOff, Wallet } from "lucide-react";
import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS } from "@/lib/session";
import { customers } from "@/lib/demo-tables";
import { clientName, clientProfile } from "@/lib/clients";
import { bucketTone, peso } from "@/lib/format";
import { has, nextStep, rowsFor, scoreTone, STEP_TONE, sum, type NextStep } from "@/lib/view";
import { ActionButton, Avatar, BalanceHero, Chip, ListRow, SectionTitle, StatPill } from "@/components/ui";
import { AnimatedList } from "@/components/motion/AnimatedList";
import { CountUp } from "@/components/motion/CountUp";
import { PressLink } from "@/components/motion/Press";

export const metadata: Metadata = { title: "Today" };

const FILTERS: { slug: string; label: string; step?: NextStep }[] = [
  { slug: "all", label: "All" },
  { slug: "call", label: "Call now", step: "Call now" },
  { slug: "escalate", label: "Escalate", step: "Escalate" },
  { slug: "remind", label: "Send reminder", step: "Send reminder" },
  { slug: "deposit", label: "Deposit check", step: "Deposit check" },
];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [{ period, result }, session, sp] = await Promise.all([getCurrentResult(), getSession(), searchParams]);
  const cust = await customers(period);
  const collectorOf = Object.fromEntries(cust.map((c) => [c.client_code, c.collector]));

  const rows = rowsFor(result, session.collector);
  // Everyone without a collector filter sees the same company-wide figure as the CFO page.
  const totalOverdue = session.collector ? sum(rows, (r) => r.overdue) : result.kpis.overdueExclDisputes;
  const covered = sum(rows, (r) => Math.min(r.overdue, r.pdcCover + (r.openPromise?.amount ?? 0)));
  const noContact = rows.filter((r) => has(r, /no contact/i)).length;
  const broken = rows.filter((r) => has(r, /broke a promise/i)).length;
  const myPdcs = result.pdcs.filter((p) => p.week === 1 && (!session.collector || collectorOf[p.client_code] === session.collector));
  const pdcWeek = sum(myPdcs, (p) => p.amount);

  const withStep = rows.map((r) => ({ r, step: nextStep(r, result) }));
  const filter = FILTERS.find((f) => f.slug === sp.f) ?? FILTERS[0];
  const shown = filter.step ? withStep.filter((x) => x.step === filter.step) : withStep;
  const counts = Object.fromEntries(FILTERS.map((f) => [f.slug, f.step ? withStep.filter((x) => x.step === f.step).length : withStep.length]));

  const top = rows[0];
  const topPhone = top ? clientProfile(top.client_code)?.phone : undefined;
  const who = session.collector ? "your accounts" : "all accounts";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <BalanceHero
        label={<>Overdue in {who} · as of {PERIODS[period].label}</>}
        amount={<CountUp value={totalOverdue} text={peso(totalOverdue)} format="peso" />}
        sub={<>{rows.length} clients to follow up{top && <> · start with <Link className="font-bold text-primary underline-offset-2 hover:underline" href={`/clients/${top.client_code}`}>{clientName(top.client_code)}</Link></>}</>}
        progress={{ value: totalOverdue ? covered / totalOverdue : 0, label: <>{peso(covered)} already covered by checks on hand and promises · {totalOverdue ? Math.round((covered / totalOverdue) * 100) : 0}% of overdue</> }}
        actions={
          <>
            <ActionButton icon={<Phone />} label="Call next" variant="primary" href={topPhone ? `tel:${topPhone.replace(/\s/g, "")}` : "/today"} external={!!topPhone} />
            <ActionButton icon={<NotebookPen />} label="Log contact" href={top ? `/clients/${top.client_code}#log` : "/clients"} />
            <ActionButton icon={<CalendarCheck2 />} label="Checks" href="/checks" />
            <ActionButton icon={<MessageCircle />} label="Ask" onClickId="ask" variant="accent" />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill icon={<PhoneOff />} value={<CountUp value={noContact} text={String(noContact)} format="int" />} label="No contact in 14+ days" tone="warn" href="/today?f=call" />
        <StatPill icon={<Wallet />} value={<CountUp value={pdcWeek} text={peso(pdcWeek)} format="peso" />} label={`Checks to deposit this week (${myPdcs.length})`} tone="good" href="/checks" />
        <StatPill icon={<AlertTriangle />} value={<CountUp value={broken} text={String(broken)} format="int" />} label="Broken promises (30 days)" tone="bad" href="/today?f=escalate" />
      </div>

      <section aria-labelledby="list-title">
        <SectionTitle title={<span id="list-title">Today&apos;s follow-up list</span>} sub="Ranked by the rules engine. Highest priority first." />
        <nav aria-label="Filter list" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const active = f.slug === filter.slug;
            return (
              <PressLink
                key={f.slug}
                href={f.slug === "all" ? "/today" : `/today?f=${f.slug}`}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-bold transition-colors ${active ? "bg-fg text-bg" : "border border-border bg-surface text-fg hover:bg-surface-2"}`}
              >
                {f.label}
                <span className={`num rounded-pill px-1.5 text-xs ${active ? "bg-bg/20" : "bg-surface-3 text-fg-muted"}`}>{counts[f.slug]}</span>
              </PressLink>
            );
          })}
        </nav>

        {shown.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="font-display text-xl font-extrabold">Nothing here</p>
            <p className="mt-1 text-sm text-fg-muted">No clients match this filter today.</p>
          </div>
        ) : (
          <AnimatedList className="list-group" label="Follow-up list">
            {shown.map(({ r, step }) => (
              <ListRow
                key={r.client_code}
                href={`/clients/${r.client_code}`}
                leading={
                  <span className="relative">
                    <Avatar code={r.client_code} />
                    <span className="num absolute -bottom-1 -left-1 grid size-5 place-items-center rounded-full border-2 border-surface bg-fg text-[10px] font-bold text-bg">{r.rank}</span>
                  </span>
                }
                title={clientName(r.client_code)}
                sub={<>{r.client_code} · {r.segment}{!session.collector && <> · {r.collector}</>}</>}
                meta={
                  <>
                    <Chip tone={STEP_TONE[step]}>{step}</Chip>
                    <span className="line-clamp-2 w-full text-xs text-fg-muted sm:line-clamp-1 sm:w-auto sm:min-w-0 sm:flex-1">{r.reasonText}</span>
                  </>
                }
                trailing={peso(r.overdue)}
                trailingSub={
                  <span className="flex items-center gap-1.5">
                    <span className={`num rounded-pill px-2 py-0.5 text-[11px] font-bold ${bucketTone(r.oldestDays)}`}>{r.oldestDays}d</span>
                    <Chip tone={scoreTone(r.score)} className="num">{r.score}</Chip>
                  </span>
                }
              />
            ))}
          </AnimatedList>
        )}
        <p className="mt-3 text-xs text-fg-subtle">Score badge = priority points from the rules engine. Day chip = oldest invoice days overdue.</p>
      </section>
    </div>
  );
}
