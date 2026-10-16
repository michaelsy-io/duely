import { agentName } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Mail, MessageSquare, Phone, ShieldAlert, CalendarClock, Banknote, History } from "lucide-react";
import { getCurrentResult } from "@/lib/data";
import { getMonthSelection, getSession, PERIODS } from "@/lib/session";
import { activity, customers, openInvoices } from "@/lib/demo-tables";
import { clientName, clientProfile } from "@/lib/clients";
import { bucketTone, fmtDate, peso } from "@/lib/format";
import { nextStep, STEP_TONE, sum } from "@/lib/view";
import { ActionButton, Avatar, BalanceHero, Card, Chip, ListGroup, ListRow, PriorityChip, SectionTitle } from "@/components/ui";
import { LogContact } from "@/components/client/LogContact";
import { DraftReminder } from "@/components/client/DraftReminder";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: clientName(code.toUpperCase()) };
}

export default async function ClientPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const profile = clientProfile(code);
  if (!profile) notFound();
  const [{ period, result }, session, sel] = await Promise.all([getCurrentResult(), getSession(), getMonthSelection()]);
  const [cust, invoices, acts] = await Promise.all([customers(period), openInvoices(period, code), activity(period, code)]);
  const c = cust.find((x) => x.client_code === code);

  const row = result.followUp.find((r) => r.client_code === code);
  const esc = result.escalations.find((e) => e.client_code === code);
  const pdcs = result.pdcsAll.filter((p) => p.client_code === code);
  const bounced = result.bouncedOpen.filter((b) => b.client_code === code);
  const hold = result.onHold.filter((h) => h.client_code === code);
  const balance = row?.totalBalance ?? sum(invoices, (i) => i.balance);
  const limit = row?.creditLimit ?? c?.credit_limit ?? 0;
  const usage = limit ? balance / limit : 0;
  const step = row ? nextStep(row, result) : null;
  const tel = profile.phone.replace(/\s/g, "");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/clients" className="btn btn-ghost btn-sm -ml-2 self-start"><ArrowLeft className="size-4" aria-hidden="true" />Clients</Link>
      {!sel.period && (
        <p role="note" className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 px-4 py-3 text-sm">
          <span className="font-bold">No data imported for {sel.label}.</span>{" "}
          <span className="text-fg-muted">This client page shows the latest books, as of {PERIODS[period].label}.</span>{" "}
          {session.role === "admin" ? (
            <Link href="/import" className="font-bold text-primary hover:underline">Import this month&apos;s files</Link>
          ) : (
            <span className="text-fg-muted">Your Admin imports the month-end files.</span>
          )}
        </p>
      )}

      <BalanceHero
        top={
          <div className="mb-5 flex flex-col items-center gap-3 [html[data-hero=left]_&]:items-start">
            <Avatar code={code} size={72} />
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{profile.name}</h1>
              <p className="mt-1 text-sm text-hero-muted">{code} · {profile.segment} · {profile.area} · {agentName(c?.collector ?? row?.collector ?? "")} · {c?.rep}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {row && <Chip tone="primary">#{row.rank} on today&apos;s list</Chip>}
              {step && <Chip tone={STEP_TONE[step]}>{step}</Chip>}
              {row && <PriorityChip score={row.score} />}
              {!row && <Chip tone="good">Up to date</Chip>}
            </div>
          </div>
        }
        label={row ? "Overdue" : "Balance"}
        amount={peso(row ? row.overdue : balance)}
        sub={row ? <>Oldest invoice <span className={`num rounded-pill px-2 py-0.5 text-xs font-bold ${bucketTone(row.oldestDays)}`}>{row.oldestDays} days</span> overdue · as of {PERIODS[period].label}</> : <>Nothing overdue as of {PERIODS[period].label}</>}
        actions={
          // Five even columns so the buttons never wrap into a lone last item on phones.
          <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 sm:gap-4">
            <ActionButton icon={<Phone />} label="Call" variant="primary" href={`tel:${tel}`} external />
            <ActionButton icon={<MessageSquare />} label="SMS" href={`sms:${tel}`} external />
            <ActionButton icon={<Mail />} label="Email" href={`mailto:${profile.email}`} external />
            <ActionButton icon={<FileText />} label="Statement" href="#invoices" external />
            <LogContact code={code} name={profile.name} period={period} by={session.roleLabel} variant="action" />
          </div>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {row && (
            <Card>
              <SectionTitle title={`Why #${row.rank} today`} sub="Points from the rules engine. Higher means call sooner." />
              <ul className="flex flex-col gap-2">
                {row.factors.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                    <span className="min-w-0 break-words text-sm font-semibold">{f.label}</span>
                    <span className={`num shrink-0 rounded-pill px-2.5 py-0.5 text-sm font-extrabold ${f.points < 0 ? "bg-good-soft text-good-fg" : "bg-primary-soft text-primary-soft-fg"}`}>{f.points > 0 ? "+" : ""}{f.points}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between px-4 pt-1 text-sm font-bold">
                  <span>Priority score</span><span className="num text-lg">{row.score}</span>
                </li>
              </ul>
            </Card>
          )}

          <DraftReminder code={code} period={period} />

          <section id="invoices" aria-labelledby="inv-title">
            <SectionTitle title={<span id="inv-title">Open invoices</span>} sub={`${invoices.length} invoices · statement as of ${PERIODS[period].label}`} />
            {invoices.length === 0 ? <Card className="text-sm text-fg-muted">No open invoices.</Card> : (
              <ListGroup label="Open invoices">
                {invoices.map((inv) => (
                  <ListRow
                    key={inv.inv_no}
                    leading={<span className="grid size-10 place-items-center rounded-full bg-surface-3 text-primary-soft-fg"><FileText className="size-5" aria-hidden="true" /></span>}
                    title={inv.inv_no}
                    sub={`Issued ${fmtDate(inv.invoice_date)} · due ${fmtDate(inv.due_date)}`}
                    trailing={peso(inv.balance)}
                    trailingSub={<span className={`num rounded-pill px-2 py-0.5 text-[11px] font-bold ${bucketTone(inv.days_overdue)}`}>{inv.days_overdue > 0 ? `${inv.days_overdue}d overdue` : "Current"}</span>}
                  />
                ))}
              </ListGroup>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <SectionTitle title="Balance vs limit" />
            <p className="num text-2xl font-extrabold">{peso(balance)} <span className="text-base font-semibold text-fg-muted">of {peso(limit)}</span></p>
            <div className="mt-3 h-3 overflow-hidden rounded-pill bg-surface-3" role="progressbar" aria-valuenow={Math.round(usage * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Credit limit used">
              <div className={`h-full rounded-pill ${usage > 1 ? "bg-bad" : usage > 0.8 ? "bg-warn" : "bg-good"}`} style={{ width: `${Math.min(100, usage * 100)}%` }} />
            </div>
            <p className={`mt-2 text-sm font-semibold ${usage > 1 ? "text-bad-fg" : "text-fg-muted"}`}>{usage > 1 ? `Over limit by ${peso(balance - limit)}` : `${Math.round(usage * 100)}% of credit limit used`}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-fg-muted">Terms</dt><dd className="font-bold">{c?.payment_terms_days ?? "–"} days</dd></div>
              <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-fg-muted">Usually pays by</dt><dd className="font-bold">{c?.usual_payment_method ?? "–"}</dd>{/PDC/.test(c?.usual_payment_method ?? "") && <dd className="text-xs text-fg-muted">PDC: post-dated check, dated for a future day</dd>}</div>
              <div className="col-span-2 rounded-2xl bg-surface-2 p-3"><dt className="text-fg-muted">Contact</dt><dd className="font-bold">{profile.contact_person}, {profile.contact_role}</dd><dd className="break-words text-fg-muted">{profile.phone} · {profile.email}</dd></div>
            </dl>
          </Card>

          <Card>
            <SectionTitle title="Status" />
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bad-soft text-bad-fg"><ShieldAlert className="size-5" aria-hidden="true" /></span>
                <span><b className="block">Escalation</b>{esc ? <>{esc.recommendedAction} · {esc.triggerText}<span className="block text-fg-muted">Approver: {esc.approver}</span></> : <span className="text-fg-muted">None needed</span>}</span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn-soft text-warn-fg"><CalendarClock className="size-5" aria-hidden="true" /></span>
                <span><b className="block">Open promise</b>{row?.openPromise ? <span className="num">{peso(row.openPromise.amount)} by {fmtDate(row.openPromise.date)}</span> : <span className="text-fg-muted">No open promise</span>}</span>
              </li>
              {bounced.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bad-soft text-bad-fg"><Banknote className="size-5" aria-hidden="true" /></span>
                  <span><b className="block">Bounced check not replaced</b><span className="num">{peso(b.amount)}</span> returned {fmtDate(b.date_returned)} ({b.daysAgo} days ago)</span>
                </li>
              ))}
              {pdcs.length === 0 && (
                <li className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-fg-muted"><Banknote className="size-5" aria-hidden="true" /></span>
                  <span><b className="block">Checks on hand</b><span className="text-fg-muted">No post-dated checks (PDC: a check dated for a future day) on hand</span></span>
                </li>
              )}
              {hold.map((h, i) => (
                <li key={`h${i}`} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-fg-muted"><ShieldAlert className="size-5" aria-hidden="true" /></span>
                  <span><b className="block">On hold (not chased)</b><span className="num">{peso(h.amount)}</span> · {h.reason}</span>
                </li>
              ))}
            </ul>
          </Card>

          {pdcs.length > 0 && (
          <Card>
            <SectionTitle title="Checks on hand" sub={`${pdcs.length} post-dated checks (PDC, dated for a future day) · ${peso(sum(pdcs, (p) => p.amount))}`} />
              <ul className="flex flex-col gap-2">
                {pdcs.map((p) => (
                  <li key={p.check_no + p.check_date} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                    <span><b className="block">{fmtDate(p.check_date, "EEE d MMM")}</b><span className="text-fg-muted">{p.check_no}{p.bank ? ` · ${p.bank}` : ""}</span>{p.flags.map((f) => <span key={f} className="mt-1 block text-xs font-bold text-bad-fg">{f}</span>)}</span>
                    <span className="num font-extrabold">{peso(p.amount)}</span>
                  </li>
                ))}
              </ul>
          </Card>
          )}

          <Card id="history">
            <SectionTitle title="Contact history" sub={acts.length ? `${acts.length} entries` : undefined} />
            {acts.length === 0 ? <p className="text-sm text-fg-muted">No contact logged yet.</p> : (
              <ol className="relative ml-2 flex flex-col gap-4 border-l-2 border-border pl-5">
                {acts.slice(0, 12).map((a, i) => (
                  <li key={i} className="relative text-sm">
                    <span className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 border-surface ${/broke|missed|returned|bounced/i.test(a.outcome) ? "bg-bad" : /promise/i.test(a.outcome) ? "bg-warn" : "bg-primary"}`} />
                    <p className="font-bold">{a.action} · {a.outcome}</p>
                    <p className="text-fg-muted">{fmtDate(a.activity_date)} · {agentName(a.collector)} · {a.contact_role}</p>
                    {a.promise_amount != null && <p className="num text-xs font-semibold text-warn-fg">Promised {peso(a.promise_amount)}{a.promise_date && ` by ${fmtDate(a.promise_date)}`}</p>}
                  </li>
                ))}
              </ol>
            )}
            {acts.length > 12 && <p className="mt-3 flex items-center gap-1 text-xs text-fg-subtle"><History className="size-3.5" aria-hidden="true" />Showing latest 12</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
