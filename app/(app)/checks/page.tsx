import Link from "next/link";
import type { Metadata } from "next";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { AlertTriangle, Banknote, CalendarCheck2 } from "lucide-react";
import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS, getMonthSelection } from "@/lib/session";
import { customers } from "@/lib/demo-tables";
import { clientName } from "@/lib/clients";
import { fmtDate, peso } from "@/lib/format";
import { sum } from "@/lib/view";
import { Avatar, Card, Chip, ListGroup, ListRow, SectionTitle, StatPill } from "@/components/ui";
import { CountUp } from "@/components/motion/CountUp";
import { RevealOnView } from "@/components/motion/Grow";

export const metadata: Metadata = { title: "Checks" };

export default async function ChecksPage() {
  const sel = await getMonthSelection();
  if (!sel.period) return <EmptyMonth variant="checks" sel={sel} />;
  const [{ period, result }, session] = await Promise.all([getCurrentResult(), getSession()]);
  const cust = await customers(period);
  const collectorOf = Object.fromEntries(cust.map((c) => [c.client_code, c.collector]));
  const mine = <T extends { client_code: string }>(xs: T[]) => (session.collector ? xs.filter((x) => collectorOf[x.client_code] === session.collector) : xs);

  const all = mine(result.pdcsAll);
  const weeks = result.inflow.map((w, i) => ({ ...w, n: i + 1, checks: all.filter((p) => p.week === i + 1) }));
  const later = all.filter((p) => p.week === 0 && !p.flags.some((f) => /PAST/i.test(f)));
  const pastDue = all.filter((p) => p.flags.some((f) => /PAST/i.test(f)));
  const bounced = mine(result.bouncedOpen);
  const onHand = sum(all, (p) => p.amount);
  const thisWeek = sum(weeks[0]?.checks ?? [], (p) => p.amount);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Checks</h1>
        <p className="mt-2 text-fg-muted">Post-dated checks on hand, lined up by deposit week. As of {PERIODS[period].label}.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill icon={<CalendarCheck2 />} value={<CountUp value={onHand} text={peso(onHand)} format="peso" />} label={`${all.length} checks on hand`} tone="primary" />
        <StatPill icon={<Banknote />} value={<CountUp value={thisWeek} text={peso(thisWeek)} format="peso" />} label="To deposit this week" tone="good" />
        <StatPill icon={<AlertTriangle />} value={<CountUp value={bounced.length} text={String(bounced.length)} format="int" />} label="Bounced, awaiting replacement" tone="bad" />
      </div>

      {pastDue.length > 0 && (
        <section>
          <SectionTitle title="Deposit now" sub="Check date has passed." />
          <ListGroup>
            {pastDue.map((p) => (
              <ListRow key={p.check_no + p.check_date} href={`/clients/${p.client_code}`} leading={<Avatar code={p.client_code} />} title={clientName(p.client_code)} sub={`${p.check_no} · dated ${fmtDate(p.check_date)}`} trailing={peso(p.amount)} trailingSub={<Chip tone="bad">Deposit now</Chip>} />
            ))}
          </ListGroup>
        </section>
      )}

      <section aria-labelledby="cal-title">
        <SectionTitle title={<span id="cal-title">Next 4 weeks</span>} sub="Checks maturing each week" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weeks.map((w, i) => (
            <RevealOnView key={w.n} delay={i * 0.06} className="grid">
              <Card pad={false} className="flex flex-col overflow-hidden">
                <div className={`px-5 py-4 ${w.n === 1 ? "bg-primary text-primary-fg" : "bg-surface-2"}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${w.n === 1 ? "opacity-80" : "text-fg-subtle"}`}>Week {w.n}{w.n === 1 && " · this week"}</p>
                  <p className="text-sm font-semibold">{fmtDate(w.start, "d MMM")} – {fmtDate(w.end, "d MMM")}</p>
                  <p className="num mt-1 font-display text-2xl font-extrabold tracking-tight">{peso(sum(w.checks, (p) => p.amount))}</p>
                  <p className={`text-xs ${w.n === 1 ? "opacity-80" : "text-fg-muted"}`}>{w.checks.length} checks</p>
                </div>
                <ul className="flex flex-1 flex-col divide-y divide-border">
                  {w.checks.length === 0 && <li className="px-5 py-6 text-sm text-fg-muted">No checks this week.</li>}
                  {w.checks.map((p) => (
                    <li key={p.check_no + p.check_date}>
                      <Link href={`/clients/${p.client_code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <Avatar code={p.client_code} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{clientName(p.client_code)}</span>
                          <span className="block text-xs text-fg-muted">{fmtDate(p.check_date, "EEE d MMM")} · {p.check_no}</span>
                          {p.flags.length > 0 && <span className="block truncate text-[11px] font-bold text-bad-fg">{p.flags.join(" · ")}</span>}
                        </span>
                        <span className="num text-sm font-extrabold">{peso(p.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </RevealOnView>
          ))}
        </div>
        {later.length > 0 && <p className="mt-3 text-sm text-fg-muted">{later.length} more checks dated later ({peso(sum(later, (p) => p.amount))}).</p>}
      </section>

      <section aria-labelledby="bounced-title">
        <SectionTitle title={<span id="bounced-title">Bounced, awaiting replacement</span>} />
        {bounced.length === 0 ? (
          <Card className="text-center text-sm text-fg-muted">No bounced checks waiting. Nice.</Card>
        ) : (
          <ListGroup>
            {bounced.map((b) => (
              <ListRow key={b.client_code + b.date_returned} href={`/clients/${b.client_code}`} leading={<Avatar code={b.client_code} />} title={clientName(b.client_code)} sub={`Returned ${fmtDate(b.date_returned)} · ${b.daysAgo} days ago`} trailing={peso(b.amount)} trailingSub={<Chip tone={b.daysAgo > 7 ? "bad" : "warn"}>{b.daysAgo > 7 ? "Credit-hold review" : "Ask for replacement"}</Chip>} />
            ))}
          </ListGroup>
        )}
      </section>
    </div>
  );
}
