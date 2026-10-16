import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { AlertTriangle, Phone, PhoneOff, Send, ShieldAlert, Wallet } from "lucide-react";
import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS, getMonthSelection } from "@/lib/session";
import { customers } from "@/lib/demo-tables";
import { listDrafts } from "@/lib/db/drafts";
import { clientName, clientProfile } from "@/lib/clients";
import { peso } from "@/lib/format";
import { has, nextStep, rowsFor, sum, type NextStep } from "@/lib/view";
import type { FollowUpRow } from "@/lib/engine/types";
import { StatPill } from "@/components/ui";
import { AnimatedList } from "@/components/motion/AnimatedList";
import { CountUp } from "@/components/motion/CountUp";
import { PressLink } from "@/components/motion/Press";
import { TodayStrip } from "@/components/today/TodayStrip";
import { DecisionStrip } from "@/components/today/DecisionStrip";
import { FollowUpItem, type RowAction } from "@/components/today/FollowUpItem";

export const metadata: Metadata = { title: "Today" };

type Filter = { slug: string; label: string; match?: (r: FollowUpRow, step: NextStep) => boolean };

// The stat tiles and the exact filters share these tests, so a tile's number always equals the list it opens.
const isNoContact = (r: FollowUpRow) => has(r, /no contact/i);
const isBroken = (r: FollowUpRow) => has(r, /broke a promise/i);

const STEP_FILTERS: Filter[] = [
  { slug: "all", label: "All" },
  { slug: "call", label: "Call now", match: (_, s) => s === "Call now" },
  { slug: "escalate", label: "Escalate", match: (_, s) => s === "Escalate" },
  { slug: "remind", label: "Send reminder", match: (_, s) => s === "Send reminder" },
  { slug: "deposit", label: "Deposit check", match: (_, s) => s === "Deposit check" },
];
const REASON_FILTERS: Filter[] = [
  { slug: "nocontact", label: "No contact 14+ days", match: (r) => isNoContact(r) },
  { slug: "broken", label: "Broken promise", match: (r) => isBroken(r) },
];
const FILTERS = [...STEP_FILTERS, ...REASON_FILTERS];

const STEP_ICON: Record<NextStep, ReactNode> = {
  "Call now": <Phone aria-hidden="true" />,
  Escalate: <ShieldAlert aria-hidden="true" />,
  "Send reminder": <Send aria-hidden="true" />,
  "Deposit check": <Wallet aria-hidden="true" />,
};

/** One action per row, matching its next step. Only the collecting agent gets a phone link. */
function actionFor(r: FollowUpRow, step: NextStep, isCollector: boolean, canDecide: boolean): RowAction {
  const client = `/clients/${r.client_code}`;
  const icon = STEP_ICON[step];
  switch (step) {
    case "Call now": {
      const phone = isCollector ? clientProfile(r.client_code)?.phone : undefined;
      return phone
        ? { label: step, icon, href: `tel:${phone.replace(/\s/g, "")}`, external: true, title: `Call ${phone}` }
        : { label: step, icon, href: client, title: "Next step is a call. Open the client page." };
    }
    case "Escalate":
      return canDecide
        ? { label: step, icon, href: "/approvals", title: "Decide the hold on the Approvals page" }
        : { label: step, icon, href: client, title: "Needs a hold decision by a supervisor. Open the client page." };
    case "Send reminder":
      return { label: step, icon, href: client, title: "Draft a reminder on the client page. A supervisor approves it before it is sent." };
    case "Deposit check":
      return { label: step, icon, href: "/checks", title: "Checks on hand cover the overdue amount. See the checks to deposit." };
  }
}

async function waitingDrafts(period: string): Promise<number | null> {
  try {
    const drafts = await listDrafts(period);
    return drafts.filter((d) => d.status === "pending" || d.status === "needs_edit").length;
  } catch {
    return null;
  }
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sel = await getMonthSelection();
  if (!sel.period) return <EmptyMonth variant="today" sel={sel} canImport={(await getSession()).role === "admin"} />;
  const [{ period, result }, session, sp] = await Promise.all([getCurrentResult(), getSession(), searchParams]);
  const isCollector = session.role === "collector";
  const canDecide = session.role === "supervisor" || session.role === "admin";
  const [cust, drafts] = await Promise.all([customers(period), canDecide ? waitingDrafts(period) : Promise.resolve(null)]);
  const collectorOf = Object.fromEntries(cust.map((c) => [c.client_code, c.collector]));

  const rows = rowsFor(result, session.collector);
  // Everyone without a collector filter sees the same company-wide figure as the CFO page.
  const totalOverdue = session.collector ? sum(rows, (r) => r.overdue) : result.kpis.overdueExclDisputes;
  const covered = sum(rows, (r) => Math.min(r.overdue, r.pdcCover + (r.openPromise?.amount ?? 0)));
  const myPdcs = result.pdcs.filter((p) => p.week === 1 && (!session.collector || collectorOf[p.client_code] === session.collector));
  const pdcWeek = sum(myPdcs, (p) => p.amount);

  // Rank shown = position on this person's list (1..N); company-wide rank stays as secondary text for collectors.
  const items = rows.map((r, i) => ({ r, step: nextStep(r, result), rank: session.collector ? i + 1 : r.rank }));
  const filter = FILTERS.find((f) => f.slug === sp.f) ?? FILTERS[0];
  const shown = filter.match ? items.filter((x) => filter.match!(x.r, x.step)) : items;
  const counts = Object.fromEntries(FILTERS.map((f) => [f.slug, f.match ? items.filter((x) => f.match!(x.r, x.step)).length : items.length]));
  const noContact = counts.nocontact;
  const broken = counts.broken;

  const top = rows[0];
  const topPhone = isCollector && top ? clientProfile(top.client_code)?.phone : undefined;
  const who = session.collector ? "your accounts" : "all accounts";

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Today&apos;s follow-ups</h1>
        <p className="mt-1 text-sm text-fg-muted">
          <span className="num">{rows.length}</span> {rows.length === 1 ? "client" : "clients"} to follow up · ranked by the rules engine · as of {PERIODS[period].label}
        </p>
      </header>

      <TodayStrip
        who={who}
        totalOverdue={totalOverdue}
        covered={covered}
        first={top && { code: top.client_code, name: clientName(top.client_code), amount: top.overdue }}
        callHref={topPhone ? `tel:${topPhone.replace(/\s/g, "")}` : undefined}
        logHref={isCollector && top ? `/clients/${top.client_code}#log` : undefined}
      />

      {session.role !== "collector" && (
        <DecisionStrip role={session.role} drafts={drafts} escalations={result.escalations.length} />
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatPill dense current={filter.slug === "nocontact"} icon={<PhoneOff />} value={<CountUp value={noContact} text={String(noContact)} format="int" />} label="No contact in 14+ days" tone="warn" href="/today?f=nocontact" />
        <StatPill dense icon={<Wallet />} value={<CountUp value={pdcWeek} text={peso(pdcWeek)} format="peso" />} label={`Checks to deposit this week (${myPdcs.length})`} tone="good" href="/checks" />
        <StatPill dense current={filter.slug === "broken"} icon={<AlertTriangle />} value={<CountUp value={broken} text={String(broken)} format="int" />} label="Broken promises (30 days)" tone="bad" href="/today?f=broken" />
      </div>

      <section aria-labelledby="list-title">
        <h2 id="list-title" className="sr-only">Follow-up list</h2>
        <nav aria-label="Filter list" className="-mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {FILTERS.map((f, i) => {
            const active = f.slug === filter.slug;
            return (
              <span key={f.slug} className="contents">
                {i === STEP_FILTERS.length && <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />}
                <PressLink
                  href={f.slug === "all" ? "/today" : `/today?f=${f.slug}`}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-bold transition-colors ${active ? "bg-fg text-bg" : "border border-border bg-surface text-fg hover:bg-surface-2"}`}
                >
                  {f.label}
                  <span className={`num rounded-pill px-1.5 text-xs ${active ? "bg-bg/20" : "bg-surface-3 text-fg-muted"}`}>{counts[f.slug]}</span>
                </PressLink>
              </span>
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
            {shown.map(({ r, step, rank }) => (
              <FollowUpItem
                key={r.client_code}
                row={r}
                name={clientName(r.client_code)}
                rank={rank}
                overallRank={session.collector ? r.rank : undefined}
                showCollector={!session.collector}
                action={actionFor(r, step, isCollector, canDecide)}
              />
            ))}
          </AnimatedList>
        )}
        <p className="mt-3 text-xs text-fg-muted">
          Each line shows the two biggest reasons, in priority points from the rules engine. Higher means call sooner. Open Details for the full breakdown.
        </p>
      </section>
    </div>
  );
}
