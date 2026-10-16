import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { AlertTriangle, CalendarCheck2, ChevronLeft, ChevronRight, CircleDot, FileText, Handshake, LayoutDashboard, Upload } from "lucide-react";
import { openMonthDashboard } from "@/app/actions";
import { getMonthSelection, getSession, addMonths, inMonthRange, isMonthKey, monthLabel, MONTH_RANGE, PERIODS } from "@/lib/session";
import { getMonthData } from "@/lib/calendar-data";
import { EVENT_KINDS, monthGrid } from "@/lib/calendar";
import { fmtDate, peso } from "@/lib/format";
import { MonthCalendar, Dot } from "@/components/calendar/MonthCalendar";

export const metadata: Metadata = { title: "Calendar" };

function SummaryTile({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="card flex min-w-0 items-start gap-3 px-4 py-3">
      <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5", tone)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-fg-muted">{label}</span>
        <span className="num block truncate text-lg font-extrabold leading-tight">{value}</span>
        <span className="block truncate text-xs text-fg-muted">{note}</span>
      </span>
    </div>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const [sel, sp, session] = await Promise.all([getMonthSelection(), searchParams, getSession()]);
  const canImport = session.role === "admin";
  const month = isMonthKey(sp.m) && inMonthRange(sp.m) ? sp.m : sel.month;
  const focus = typeof sp.d === "string" && sp.d.slice(0, 7) === month && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : null;
  const data = await getMonthData(month);
  const s = data.summary;
  const today = sel.today;
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const isSelected = month === sel.month;
  const closeDate = data.hasData ? data.source.asOf : null;
  const eventCount = Object.values(data.days).reduce((a, d) => a + d.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Calendar</h1>
        <p className="mt-2 text-fg-muted">Checks, invoices, promises and reviews by day. Today on the demo clock is {fmtDate(today)}.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Change month" className="flex items-center gap-1">
          {prev >= MONTH_RANGE.first ? (
            <Link href={`/calendar?m=${prev}`} aria-label={`Previous month, ${monthLabel(prev)}`} className="grid size-11 place-items-center rounded-full border border-border bg-surface hover:bg-surface-2"><ChevronLeft className="size-5" aria-hidden="true" /></Link>
          ) : (
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-border text-fg-subtle opacity-50"><ChevronLeft className="size-5" /></span>
          )}
          {next <= MONTH_RANGE.last ? (
            <Link href={`/calendar?m=${next}`} aria-label={`Next month, ${monthLabel(next)}`} className="grid size-11 place-items-center rounded-full border border-border bg-surface hover:bg-surface-2"><ChevronRight className="size-5" aria-hidden="true" /></Link>
          ) : (
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-border text-fg-subtle opacity-50"><ChevronRight className="size-5" /></span>
          )}
        </nav>
        <form action={openMonthDashboard} className="min-w-0">
          <input type="hidden" name="month" value={month} />
          <button type="submit" className="group min-h-[44px] rounded-pill px-2 text-left" title="Open this month's dashboard">
            <span className="block font-display text-2xl font-extrabold tracking-tight group-hover:text-primary sm:text-3xl" aria-live="polite">{monthLabel(month)}</span>
            <span className="sr-only">Open this month&apos;s dashboard</span>
          </button>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/calendar?m=${today.slice(0, 7)}&d=${today}`} className="btn btn-secondary btn-sm">Today</Link>
          <form action={openMonthDashboard}>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="btn btn-primary btn-sm" aria-label={`Open the ${monthLabel(month)} dashboard`}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Open this month&apos;s dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          </form>
        </div>
      </div>

      {!data.hasData && (
        <div className="flex flex-col gap-3 rounded-card border border-dashed border-primary/40 bg-primary-soft/50 px-5 py-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-fg">
            <span className="font-bold">No month-end data has been imported for {monthLabel(month)}.</span>{" "}
            <span className="text-fg-muted">
              {eventCount > 0
                ? `Showing items already dated in this month from the ${data.source.label} books.`
                : `Nothing in the ${data.source.label} books is dated in this month yet.`}
            </span>
          </p>
          {canImport ? (
            <Link href="/import" className="btn btn-primary btn-sm self-start sm:self-auto"><Upload className="size-4" aria-hidden="true" />Import this month&apos;s files</Link>
          ) : (
            <p className="text-sm font-semibold text-fg-muted">Your Admin imports the month-end files.</p>
          )}
        </div>
      )}

      <section aria-label={`${monthLabel(month)} summary`} className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <SummaryTile icon={<CalendarCheck2 />} tone="bg-primary-soft text-primary-soft-fg" label="Checks dated" value={s.checks.count ? peso(s.checks.total) : "—"} note={`${s.checks.count} checks${s.checks.bounced ? ` · ${s.checks.bounced} bounced` : ""}`} />
        <SummaryTile icon={<FileText />} tone="bg-warn-soft text-warn-fg" label="Open invoices due" value={s.invoices.count ? peso(s.invoices.total) : "—"} note={`${s.invoices.count} invoices${s.invoices.overdue ? ` · ${s.invoices.overdue} now late` : ""}`} />
        <SummaryTile icon={<Handshake />} tone="bg-good-soft text-good-fg" label="Promises to pay" value={s.promises.count ? peso(s.promises.total) : "—"} note={`${s.promises.count} promises${s.promises.missed ? ` · ${s.promises.missed} missed` : ""}`} />
        <SummaryTile icon={<AlertTriangle />} tone="bg-bad-soft text-bad-fg" label="Bounced checks returned" value={s.bounced.count ? peso(s.bounced.total) : "—"} note={`${s.bounced.count} returned${s.bounced.open ? ` · ${s.bounced.open} not replaced` : ""}${s.reviews ? ` · ${s.reviews} reviews at close` : ""}`} />
      </section>

      <section className="card p-2 sm:p-4" aria-labelledby="cal-legend">
        <ul id="cal-legend" aria-label="Legend" className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 pt-1 text-xs font-semibold text-fg-muted">
          {EVENT_KINDS.map((k) => (
            <li key={k.kind} className="flex items-center gap-1.5"><Dot kind={k.kind} />{k.label}</li>
          ))}
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-fg">1</span>Today</li>
        </ul>
        <ul aria-label="Day shading" className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-fg-muted">
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-4 rounded-md bg-bad-soft" />Pink day: a check bounced or a promise was missed</li>
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-4 rounded-md border border-border bg-surface" />White day: something is scheduled</li>
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-4 rounded-md bg-surface-2" />Shaded day: nothing scheduled</li>
          {closeDate && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-4 rounded-md ring-2 ring-inset ring-primary/60" />Outlined day: month-end close, when the books are counted</li>}
        </ul>
        <MonthCalendar
          key={month}
          cells={monthGrid(month)}
          days={data.days}
          kinds={EVENT_KINDS}
          today={today}
          closeDate={closeDate}
          focusDate={focus}
          monthLabel={monthLabel(month)}
        />
        <p className="mt-3 flex items-start gap-1.5 px-1 text-xs text-fg-subtle">
          <CircleDot className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Hover, tap or focus a day (arrow keys move, Esc closes). Source: {data.hasData ? `${monthLabel(month)} month-end books` : `${data.source.label} books`}, figures from the rules engine and the imported rows.
          {isSelected ? "" : ` You are viewing ${sel.label} elsewhere in the app.`}
          {!data.hasData && month < PERIODS.P1.month ? " Older months only show items still recorded in the 31 Aug books." : ""}
        </p>
      </section>
    </div>
  );
}
