import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Banknote, CalendarCheck2, CalendarDays, CalendarRange, Download, Inbox, NotebookPen, Phone, PhoneOff, Search, Upload, Wallet } from "lucide-react";
import { openMonthDashboard } from "@/app/actions";
import { PERIODS, type MonthSelection } from "@/lib/session";
import { BUCKETS } from "@/lib/format";
import { BalanceHero, Card, SectionTitle, StatPill } from "@/components/ui";

export type EmptyVariant = "today" | "clients" | "checks" | "cfo" | "approvals";

const DASH = "—";

/** Banner shared by every empty-month dashboard: what is missing and what to do. */
function EmptyBanner({ sel }: { sel: MonthSelection }) {
  const back = PERIODS[sel.dataPeriod];
  return (
    <section aria-labelledby="empty-month-title" className="anim-fade flex flex-col gap-4 rounded-card border border-dashed border-primary/40 bg-primary-soft/50 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-primary"><CalendarDays className="size-6" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{sel.label}</p>
        <h2 id="empty-month-title" className="font-display text-xl font-extrabold tracking-tight">No month-end data for {sel.label} yet</h2>
        <p className="mt-1 text-sm text-fg-muted">This is how the dashboard will look once the files are in. Every figure stays blank until the rules engine has this month&apos;s books.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/import" className="btn btn-primary"><Upload className="size-4" aria-hidden="true" />Import this month&apos;s files</Link>
        <Link href={`/calendar?m=${sel.month}`} className="btn btn-secondary"><CalendarRange className="size-4" aria-hidden="true" />Calendar</Link>
        <form action={openMonthDashboard}>
          <input type="hidden" name="month" value={sel.dataPeriod} />
          <input type="hidden" name="to" value="/today" />
          <button type="submit" className="btn btn-ghost">Back to {back.short}</button>
        </form>
      </div>
    </section>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="h-display text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-fg-muted">{sub}</p>
    </div>
  );
}

/** Static (non-shimmering) placeholder rows. */
function GhostRows({ n = 4, label }: { n?: number; label: string }) {
  return (
    <div className="list-group" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="pad-y flex items-center gap-3 px-4 sm:px-5" aria-hidden="true">
          <span className="size-11 shrink-0 rounded-avatar bg-surface-3" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="h-3 rounded-pill bg-surface-3" style={{ width: `${62 - i * 9}%` }} />
            <span className="h-2.5 w-1/3 rounded-pill bg-surface-2" />
          </span>
          <span className="num text-[15px] font-extrabold text-fg-subtle">{DASH}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyNote({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-fg-muted [&_svg]:size-6">{icon}</span>
      <p className="font-display text-xl font-extrabold">{title}</p>
      <p className="max-w-md text-sm text-fg-muted">{body}</p>
      <Link href="/import" className="btn btn-primary btn-sm mt-2"><Upload className="size-4" aria-hidden="true" />Import this month&apos;s files</Link>
    </Card>
  );
}

function Tile({ label, note, primary }: { label: string; note?: string; primary?: boolean }) {
  return (
    <div className={clsx("flex flex-col gap-1.5 rounded-card border p-5", primary ? "border-transparent bg-primary text-primary-fg" : "border-border bg-surface")}>
      <p className={clsx("text-sm font-semibold", primary ? "opacity-80" : "text-fg-muted")}>{label}</p>
      <p className={clsx("num font-display text-[34px] font-extrabold leading-none tracking-[-0.04em] sm:text-[40px]", !primary && "text-fg-subtle")}>{DASH}</p>
      {note && <p className={clsx("text-xs", primary ? "opacity-80" : "text-fg-muted")}>{note}</p>}
    </div>
  );
}

/**
 * The dashboard pages for a month with no imported data: same layout, blank figures ("—"),
 * and a clear call to action. Never shows a number.
 */
export function EmptyMonth({ variant, sel }: { variant: EmptyVariant; sel: MonthSelection }) {
  const banner = <EmptyBanner sel={sel} />;
  const pill = (icon: React.ReactNode, label: string, tone: "warn" | "good" | "bad" | "primary") => (
    <StatPill icon={icon} value={<span className="text-fg-subtle">{DASH}</span>} label={label} tone={tone} />
  );

  if (variant === "today") {
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <BalanceHero
          label={<>Overdue in all accounts · {sel.label}</>}
          amount={<span className="text-fg-subtle">{DASH}</span>}
          sub={<>No follow-up list yet: import {sel.label}&apos;s files to rank clients.</>}
          progress={{ value: 0, label: <>Coverage by checks on hand and promises appears here</> }}
          actions={
            <>
              <Link href="/import" className="group flex min-w-[54px] flex-col items-center gap-1.5 rounded-2xl p-1 sm:min-w-[64px] sm:gap-2">
                <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-fg sm:size-14 [&_svg]:size-5 sm:[&_svg]:size-6"><Upload /></span>
                <span className="text-xs font-semibold sm:text-[13px]">Import</span>
              </Link>
              {[{ i: <Phone />, l: "Call next" }, { i: <NotebookPen />, l: "Log contact" }].map((a) => (
                <span key={a.l} aria-disabled="true" className="flex min-w-[54px] flex-col items-center gap-1.5 rounded-2xl p-1 opacity-50 sm:min-w-[64px] sm:gap-2">
                  <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-primary-soft-fg sm:size-14 [&_svg]:size-5 sm:[&_svg]:size-6">{a.i}</span>
                  <span className="text-xs font-semibold sm:text-[13px]">{a.l}</span>
                </span>
              ))}
              <Link href={`/calendar?m=${sel.month}`} className="group flex min-w-[54px] flex-col items-center gap-1.5 rounded-2xl p-1 sm:min-w-[64px] sm:gap-2">
                <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-primary-soft-fg sm:size-14 [&_svg]:size-5 sm:[&_svg]:size-6"><CalendarRange /></span>
                <span className="text-xs font-semibold sm:text-[13px]">Calendar</span>
              </Link>
            </>
          }
        />
        {banner}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {pill(<PhoneOff />, "No contact in 14+ days", "warn")}
          {pill(<Wallet />, "Checks to deposit this week", "good")}
          {pill(<AlertTriangle />, "Broken promises (30 days)", "bad")}
        </div>
        <section>
          <SectionTitle title="Today's follow-up list" sub="Ranked by the rules engine once this month's books are in." />
          <GhostRows label="Follow-up list placeholder" />
        </section>
      </div>
    );
  }

  if (variant === "clients") {
    return (
      <div className="flex flex-col gap-6">
        <Title title="Clients" sub={`Balances and follow-up order for ${sel.label} appear after import.`} />
        {banner}
        <div className="relative" aria-hidden="true">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <div className="input flex items-center pl-10 text-fg-subtle">Search clients</div>
        </div>
        <GhostRows n={5} label="Client list placeholder" />
      </div>
    );
  }

  if (variant === "checks") {
    return (
      <div className="flex flex-col gap-8">
        <Title title="Checks" sub={`Post-dated checks on hand, lined up by deposit week. ${sel.label}.`} />
        {banner}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {pill(<CalendarCheck2 />, "Checks on hand", "primary")}
          {pill(<Banknote />, "To deposit this week", "good")}
          {pill(<AlertTriangle />, "Bounced, awaiting replacement", "bad")}
        </div>
        <section>
          <SectionTitle title="Next 4 weeks" sub="Checks maturing each week" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} pad={false} className="overflow-hidden">
                <div className="bg-surface-2 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-fg-subtle">Week {n}</p>
                  <p className="num mt-1 font-display text-2xl font-extrabold tracking-tight text-fg-subtle">{DASH}</p>
                </div>
                <p className="px-5 py-6 text-sm text-fg-muted">No register imported.</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (variant === "cfo") {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Title title="Receivables at a glance" sub={`Month ending ${sel.label}. Figures appear once the rules engine has this month's books.`} />
          <span className="btn btn-secondary pointer-events-none opacity-50" aria-disabled="true"><Download className="size-4" aria-hidden="true" />Month report</span>
        </div>
        {banner}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile primary label="Total receivables" note="Ledger and aging gap" />
          <Tile label="Days sales outstanding" />
          <Tile label="Collection efficiency" note="Collected this month vs collectible" />
          <Tile label="Over 60 / over 90 days" note="Share of total receivables" />
          <Tile label="At risk" note="90+ days plus unreplaced bounced checks" />
          <Tile label="Est. bad debt vs allowance" />
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle title="Aging" />
            <div className="mb-5 h-4 rounded-pill bg-surface-2" aria-hidden="true" />
            <ul className="flex flex-col gap-3">
              {BUCKETS.map((b) => (
                <li key={b} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-bold">{b === "Current" ? "Current" : `${b} d`}</span>
                  <span className="h-7 rounded-lg bg-surface-2" aria-hidden="true" />
                  <span className="num w-[72px] text-right font-bold text-fg-subtle">{DASH}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle title="Expected cash in, next 4 weeks" />
            <div className="flex h-56 items-end gap-3 sm:gap-5" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="num text-xs font-extrabold text-fg-subtle">{DASH}</span>
                  <span className="h-[12%] w-full max-w-[72px] rounded-xl border border-dashed border-border bg-surface-2" />
                  <span className="text-xs font-bold text-fg-muted">Week {n}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <section>
          <SectionTitle title="Exceptions and flags" sub="Raised by the rules engine after import" />
          <GhostRows n={3} label="Flags placeholder" />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Title title="Approvals" sub={`Nothing reaches a client without a person saying yes. Final notices also need top management. ${sel.label}.`} />
      {banner}
      <EmptyNote icon={<Inbox />} title="No drafts for this month" body={`Reminders are drafted from the ranked follow-up list, so the queue for ${sel.label} fills after import. Drafts for earlier months stay under their own month.`} />
    </div>
  );
}
