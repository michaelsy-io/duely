// Collections priority score and the ranked follow-up list.
import type { FollowUpRow, OnHoldRow } from "./types";
import { SCORE } from "./rules";
import { type Model, sum, ksum, mean, sortedGroups, sortByDate, quantile } from "./model";
import type { Base } from "./aging";
import { peso, fixed } from "./format";
import { isoOf } from "./dates";

export interface OdEntry { overdue: number; oldest: number; }
export interface NettedRow { client_code: string; amount: number; dropsOff: boolean; }

export interface FollowUpResult {
  rows: FollowUpRow[];
  od: Map<string, OdEntry>; // clients still overdue after netting
  netted: NettedRow[];
  q80: number;
  q50: number;
}

export function computeFollowUp(m: Model, b: Base): FollowUpResult {
  const { cut } = m;
  const od = new Map<string, OdEntry>();
  for (const [c, g] of sortedGroups(b.overdue, (a) => a.client_code)) {
    od.set(c, { overdue: ksum(g.map((x) => x.balance)), oldest: Math.max(...g.map((x) => x.days_overdue)) });
  }
  // unapplied cash sits against the client's overdue balance (oldest invoices first)
  const nettedRaw: [string, number][] = [];
  for (const [c, g] of sortedGroups(b.unapplied, (p) => p.client_code)) {
    const e = od.get(c);
    if (!e) continue;
    const left = sum(g.map((p) => p.amount));
    const inv = sortByDate(b.overdue.filter((x) => x.client_code === c), (x) => x.due_date);
    let cum = 0;
    const still = inv.filter((x) => { cum += x.balance; return cum - left > 0; });
    nettedRaw.push([c, left]);
    e.overdue = Math.max(e.overdue - left, 0);
    e.oldest = still.length ? Math.max(...still.map((x) => x.days_overdue)) : 0;
  }
  for (const [c, e] of [...od]) if (!(e.overdue > 0)) od.delete(c);
  const netted = nettedRaw.map(([c, amount]) => ({ client_code: c, amount, dropsOff: !od.has(c) }));

  const amounts = [...od.values()].map((e) => e.overdue);
  const q80 = quantile(amounts, SCORE.amountTopQuantile);
  const q50 = quantile(amounts, SCORE.amountMidQuantile);

  const dueBy = new Map(m.sales.map((s) => [s.inv_no, s.due_date]));
  const paid = m.pay
    .filter((p) => p.applied_to_invoice !== null && dueBy.has(p.applied_to_invoice))
    .map((p) => ({ client_code: p.client_code, payment_date: p.payment_date, late: p.payment_date - (dueBy.get(p.applied_to_invoice!) as number) }));
  const lastContact = new Map<string, number>();
  for (const a of m.act) lastContact.set(a.client_code, Math.max(lastContact.get(a.client_code) ?? -Infinity, a.activity_date));

  const rows: Omit<FollowUpRow, "rank">[] = [];
  for (const [c, r] of od) {
    const cust = m.cust.get(c);
    const creditLimit = cust?.credit_limit ?? NaN;
    const reasons: string[] = [];
    const factors: { label: string; points: number }[] = [];
    let pts = 0;
    const add = (label: string, points: number, reason?: string) => {
      pts += points;
      if (points !== 0) factors.push({ label, points });
      if (reason) reasons.push(reason);
    };
    const o = Math.trunc(r.oldest);
    const bp = SCORE.oldest.find((x) => o <= x.maxDays)!.points;
    add(`${o} days overdue`, bp, `${o} days overdue`);
    const ap = r.overdue >= q80 ? SCORE.amountTopPoints : r.overdue >= q50 ? SCORE.amountMidPoints : 0;
    add(ap === SCORE.amountTopPoints ? "Overdue amount in top 20%" : "Overdue amount in next 30%", ap);

    // broken promise in last 30 days
    const prs = m.act.filter(
      (a) => a.client_code === c && a.promise_date !== null && a.promise_date <= cut && a.promise_date > cut - SCORE.brokenPromiseWindowDays,
    );
    let broke = false;
    for (const p of prs) {
      const got = sum(m.pay.filter((x) => x.client_code === c && x.payment_date > p.activity_date && x.payment_date <= (p.promise_date as number)).map((x) => x.amount));
      if (p.promise_amount !== null && !Number.isNaN(p.promise_amount) && got < SCORE.brokenPromiseMinShare * p.promise_amount) broke = true;
    }
    if (broke) add("Broke a promise in the last 30 days", SCORE.brokenPromisePoints, "broke a promise in the last 30 days");
    if (m.bnc.some((x) => x.client_code === c)) {
      const notRep = b.bouncedOpen.some((x) => x.client_code === c);
      const t = "bounced check in last 12 months" + (notRep ? " (not replaced)" : "");
      add("Bounced check in last 12 months", SCORE.bouncedCheckPoints, t);
    }
    const bal = b.balTotal.get(c) ?? 0;
    if (bal > creditLimit) add("Over credit limit", SCORE.overCreditLimitPoints, `over credit limit (${peso(bal)} vs ${peso(creditLimit)})`);
    const lc = lastContact.get(c);
    if (lc === undefined || cut - lc >= SCORE.noContactDays) add("No contact in 14+ days", SCORE.noContactPoints, "no contact in 14+ days");
    const pl = paid.filter((x) => x.client_code === c);
    if (pl.length >= SCORE.slowdownMinPayments) {
      const recent = mean(pl.filter((x) => x.payment_date > cut - SCORE.slowdownRecentDays).map((x) => x.late));
      const avg = mean(pl.map((x) => x.late));
      if (!Number.isNaN(recent) && recent - avg >= SCORE.slowdownDeltaDays) {
        add("Payment slowdown", SCORE.slowdownPoints, `slowdown: paying ${fixed(recent, 0)} days late vs ${fixed(avg, 0)}-day 12-month average`);
      }
    }
    const cover = sum(b.onhand.filter((p) => p.client_code === c).map((p) => p.amount));
    if (cover >= r.overdue) add("PDCs on hand cover the overdue amount", SCORE.pdcCoverPoints, `PDCs on hand ${peso(cover)} cover the overdue amount`);
    const op = b.openProm.find((p) => p.client_code === c);
    rows.push({
      client_code: c,
      segment: cust?.segment ?? "",
      collector: cust?.collector ?? "",
      overdue: r.overdue,
      oldestDays: o,
      score: pts,
      reasons,
      reasonText: reasons.join("; "),
      factors,
      openPromise: op ? { amount: op.promise_amount ?? 0, date: isoOf(op.promise_date as number) } : null,
      pdcCover: cover,
      totalBalance: bal,
      creditLimit,
    });
  }
  const sorted = rows
    .map((r, i) => ({ r, i }))
    .sort((a, z) => z.r.score - a.r.score || z.r.overdue - a.r.overdue || a.i - z.i)
    .map(({ r }, i) => ({ rank: i + 1, ...r }));
  return { rows: sorted, od, netted, q80, q50 };
}

export function computeOnHold(b: Base): (OnHoldRow & { inv_no: string | null })[] {
  return b.openDisp.map((d) => ({ client_code: d.client_code, inv_no: d.inv_no, reason: d.reason, amount: d.amount }));
}
