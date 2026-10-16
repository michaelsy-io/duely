import type { Metadata } from "next";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { ArrowDownRight, ArrowUpRight, Download, Flag } from "lucide-react";
import clsx from "clsx";
import { getCurrentResult, getResult } from "@/lib/data";
import { redirect } from "next/navigation";
import { PERIODS, getMonthSelection, getSession, previousPeriod } from "@/lib/session";
import { clientName } from "@/lib/clients";
import { BUCKETS, bucketColor, fmtDate, peso, pesoShort, pct } from "@/lib/format";
import { Card, SectionTitle } from "@/components/ui";
import { CountUp } from "@/components/motion/CountUp";
import { GrowBar } from "@/components/motion/Grow";

export const metadata: Metadata = { title: "CFO view" };

type Dir = "lower-better" | "higher-better";

function Delta({ vs, now, prev, dir, fmt }: { vs: string; now: number; prev: number | undefined; dir: Dir; fmt: (n: number) => string }) {
  if (prev === undefined) return null;
  const d = now - prev;
  if (Math.abs(d) < 1e-9) return <span className="text-xs font-semibold text-fg-subtle">No change vs {vs}</span>;
  const good = dir === "lower-better" ? d < 0 : d > 0;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={clsx("inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-xs font-bold", good ? "bg-good-soft text-good-fg" : "bg-bad-soft text-bad-fg")}>
      <Icon className="size-3.5" aria-hidden="true" />
      {d > 0 ? "+" : "-"}{fmt(Math.abs(d))} vs {vs}
    </span>
  );
}

function Tile({ label, value, note, delta, tone, hint }: { label: string; value: React.ReactNode; note?: React.ReactNode; delta?: React.ReactNode; tone?: "bad" | "good" | "primary"; hint?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1.5 rounded-card border p-5", tone === "primary" ? "border-transparent bg-primary text-primary-fg" : "border-border bg-surface")}>
      <p className={clsx("text-sm font-semibold", tone === "primary" ? "opacity-80" : "text-fg-muted")} title={hint}>{label}</p>
      <p className="num font-display text-[34px] font-extrabold leading-none tracking-[-0.04em] sm:text-[40px]">{value}</p>
      {note && <p className={clsx("text-xs", tone === "primary" ? "opacity-80" : tone === "bad" ? "font-semibold text-bad-fg" : "text-fg-muted")}>{note}</p>}
      {delta}
    </div>
  );
}

export default async function CfoPage() {
  const [sel, session] = await Promise.all([getMonthSelection(), getSession()]);
  // Collecting agents work their own list; the company-wide view is for supervisors and management.
  if (session.role === "collector") redirect("/today");
  if (!sel.period) return <EmptyMonth variant="cfo" sel={sel} canImport={session.role === "admin"} />;
  const { period, result: r } = await getCurrentResult();
  const prevPeriod = previousPeriod(period, sel.imported);
  const prev = prevPeriod ? await getResult(prevPeriod) : null;
  const k = r.kpis;
  const pk = prev?.kpis;
  const vs = prevPeriod ? PERIODS[prevPeriod].short : "";
  const gap = k.allowance - k.estimatedBadDebt;
  const totalB = BUCKETS.reduce((a, b) => a + k.buckets[b], 0);
  const maxInflow = Math.max(...r.inflow.map((w) => w.total), 1);
  const avgInflow = r.inflow.reduce((a, w) => a + w.total, 0) / Math.max(r.inflow.length, 1);
  const pp = (n: number) => `${(n * 100).toFixed(1)} pts`;
  const lowWeek = (total: number) => total < avgInflow * 0.8;
  const lowWeeks = r.inflow.map((w, i) => ({ w, n: i + 1 })).filter(({ w }) => lowWeek(w.total));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-4xl sm:text-5xl">Receivables at a glance</h1>
          <p className="mt-2 text-fg-muted">Month ending {PERIODS[period].label}{prevPeriod && ` · compared with ${PERIODS[prevPeriod].short}`}. All figures from the rules engine.</p>
        </div>
        <a href={`/cfo/report?period=${period}`} className="btn btn-secondary"><Download className="size-4" aria-hidden="true" />Month report</a>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile tone="primary" label="Total receivables" value={<CountUp value={k.totalAr} text={pesoShort(k.totalAr)} format="pesoShort" />} note={<>Ledger {peso(k.ledgerAr)} · gap {peso(r.control.gap)}</>} />
        <Tile label="Days sales outstanding (DSO)" hint="DSO: on average, how many days it takes to collect a sale. Lower is better." note="Average days to turn a sale into cash" value={<><CountUp value={k.dso} text={k.dso.toFixed(1)} format="fixed" digits={1} /><span className="text-lg font-bold text-fg-muted"> days</span></>} delta={<Delta vs={vs} now={k.dso} prev={pk?.dso} dir="lower-better" fmt={(n) => `${n.toFixed(1)} d`} />} />
        <Tile label="Collection efficiency" value={<CountUp value={k.collectionEfficiency} text={pct(k.collectionEfficiency)} format="pct" />} note="Collected this month vs collectible" delta={<Delta vs={vs} now={k.collectionEfficiency} prev={pk?.collectionEfficiency} dir="higher-better" fmt={pp} />} />
        <Tile label="Over 60 / over 90 days" value={<><CountUp value={k.pctOver60} text={pct(k.pctOver60)} format="pct" /> <span className="text-fg-subtle">/</span> <CountUp value={k.pctOver90} text={pct(k.pctOver90)} format="pct" /></>} note="Share of total receivables" delta={<Delta vs={vs} now={k.pctOver60} prev={pk?.pctOver60} dir="lower-better" fmt={pp} />} />
        <Tile label="At risk" value={<CountUp value={k.atRisk} text={peso(k.atRisk)} format="peso" />} note="90+ days plus unreplaced bounced checks" delta={<Delta vs={vs} now={k.atRisk} prev={pk?.atRisk} dir="lower-better" fmt={pesoShort} />} />
        <Tile
          tone={gap < 0 ? "bad" : undefined}
          label="Est. bad debt vs allowance"
          value={<CountUp value={k.estimatedBadDebt} text={peso(k.estimatedBadDebt)} format="peso" />}
          note={gap < 0 ? <>Allowance {peso(k.allowance)} is short by {peso(-gap)}</> : <>Allowance {peso(k.allowance)} covers it with {peso(gap)} to spare</>}
          delta={<Delta vs={vs} now={k.estimatedBadDebt} prev={pk?.estimatedBadDebt} dir="lower-better" fmt={pesoShort} />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Aging" sub={`Overdue excl. disputes ${peso(k.overdueExclDisputes)}`} />
          <div className="mb-5 h-4 overflow-hidden rounded-pill" aria-hidden="true">
            <GrowBar as="div" axis="x" className="flex h-full w-full">
              {BUCKETS.map((b) => <span key={b} style={{ width: `${(k.buckets[b] / totalB) * 100}%`, background: bucketColor(b) }} />)}
            </GrowBar>
          </div>
          <ul className="flex flex-col gap-3">
            {BUCKETS.map((b, i) => {
              const max = Math.max(...BUCKETS.map((x) => k.buckets[x]));
              return (
                <li key={b} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-bold">{b === "Current" ? "Current" : `${b} d`}</span>
                  <span className="h-7 overflow-hidden rounded-lg bg-surface-2">
                    <GrowBar axis="x" delay={i * 0.06} className="block h-full rounded-lg" style={{ width: `${Math.max(0.8, (k.buckets[b] / max) * 100)}%`, background: bucketColor(b) }} />
                  </span>
                  <span className="num w-[120px] text-right font-bold">{peso(k.buckets[b])}<span className="block text-xs font-semibold text-fg-subtle" title="Loss rate: share of this age group expected never to be collected, based on past write-offs">loss rate {pct(k.lossRates[b], 2)}</span></span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-fg-muted"><span className="font-bold text-fg">Loss rate</span> is the share of each age group expected never to be collected, based on past write-offs. It drives the bad-debt estimate.</p>
        </Card>

        <Card>
          <SectionTitle title="Expected cash in, next 4 weeks" sub={`${peso(r.inflow.reduce((a, w) => a + w.total, 0))} in total`} />
          <div className="flex h-56 items-end gap-3 sm:gap-5" role="img" aria-label="Expected inflow by week">
            {r.inflow.map((w, i) => (
              <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-xs font-extrabold sm:text-sm">{pesoShort(w.total)}</span>
                <GrowBar as="div" axis="y" delay={i * 0.08} className="flex w-full max-w-[72px] flex-col-reverse overflow-hidden rounded-xl" style={{ height: `${(w.total / maxInflow) * 78}%` }}>
                  <span className="bg-primary" style={{ height: `${(w.pdcs / w.total) * 100}%` }} title={`Checks ${peso(w.pdcs)}`} />
                  <span className="bg-warn" style={{ height: `${(w.promises / w.total) * 100}%` }} title={`Promises ${peso(w.promises)}`} />
                  <span className="bg-accent" style={{ height: `${(w.currentInvoices / w.total) * 100}%` }} title={`Invoices due ${peso(w.currentInvoices)}`} />
                </GrowBar>
                <span className={clsx("text-xs font-bold", lowWeek(w.total) ? "text-bad-fg" : "text-fg-muted")}>Week {i + 1}</span>
                <span className="-mt-1.5 text-xs text-fg-subtle">{fmtDate(w.start, "d MMM")}</span>
                {lowWeek(w.total) && <span className="-mt-1 rounded-pill bg-bad-soft px-1.5 text-xs font-bold text-bad-fg">Low</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />Checks maturing</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-warn" />Promises due</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-accent" />Invoices falling due</span>
          </div>
          {lowWeeks.length > 0 && (
            <p className="mt-3 text-xs text-fg-muted">
              <span className="font-bold text-bad-fg">{lowWeeks.map(({ n }) => `Week ${n}`).join(" and ")} {lowWeeks.length > 1 ? "are" : "is"} low:</span> expected cash is less than 80% of the 4-week average ({pesoShort(avgInflow)} a week), so fewer checks, promises or invoices fall due then.
            </p>
          )}
        </Card>
      </div>

      <Card pad={false} className="overflow-hidden">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0"><SectionTitle title="Receivables by sales rep" /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-fg-subtle">
                <th scope="col" className="px-5 py-3 sm:px-6">Rep</th>
                <th scope="col" className="px-3 py-3 text-right">Total</th>
                <th scope="col" className="px-3 py-3 text-right">Overdue</th>
                <th scope="col" className="px-3 py-3 text-right">Over 60</th>
                <th scope="col" className="px-3 py-3 text-right">DSO</th>
                <th scope="col" className="px-3 py-3 text-right">Discounts</th>
                <th scope="col" className="px-3 py-3 text-right">Credit memos</th>
                <th scope="col" className="px-5 py-3 text-right sm:px-6">Sold to 60+ clients</th>
              </tr>
            </thead>
            <tbody className="num">
              {r.reps.map((x) => (
                <tr key={x.rep} className="border-b border-border last:border-0">
                  <th scope="row" className="px-5 py-3.5 text-left font-bold sm:px-6">{x.rep}</th>
                  <td className="px-3 text-right font-semibold">{peso(x.totalAr)}</td>
                  <td className="px-3 text-right">{peso(x.overdue)}</td>
                  <td className={clsx("px-3 text-right", x.pctOver60 >= 0.05 && "font-bold text-bad-fg")}>{pct(x.pctOver60)}</td>
                  <td className={clsx("px-3 text-right", x.dso > 100 && "font-bold text-warn-fg")}>{Math.round(x.dso)}</td>
                  <td className="px-3 text-right">{pct(x.discountRate)}</td>
                  <td className="px-3 text-right">{pct(x.creditMemoRate, 2)}</td>
                  <td className={clsx("px-5 text-right sm:px-6", x.salesTo60Plus > 0 && "font-bold text-bad-fg")}>{peso(x.salesTo60Plus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section>
        <SectionTitle title="Exceptions and flags" sub={`${r.flags.length} items need an owner`} />
        <div className="list-group">
          {r.flags.map((f, i) => (
            <div key={i} className="pad-y flex items-start gap-3 px-4 sm:px-5">
              <span className={clsx("mt-0.5 grid size-10 shrink-0 place-items-center rounded-full", /write-off|concentration/i.test(f.flag) ? "bg-bad-soft text-bad-fg" : "bg-warn-soft text-warn-fg")}><Flag className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{f.flag} · {f.client_code ? clientName(f.client_code) : f.who}</span>
                <span className="block text-[13px] text-fg-muted">{f.rule} · source {f.source}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className="num text-[15px] font-extrabold">{peso(f.amount)}</span>
                <span className="rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-fg-muted">{f.owner}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
