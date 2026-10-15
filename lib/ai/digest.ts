// Morning digest + due reminders for n8n hooks. "Today" is the demo clock (engine asOf), never the wall clock.
import { createNotification } from "@/lib/db/notifications";
import { addDays, engine, nameOf, peso, readDemoCsv, shortDate, type Period } from "@/lib/ai/context";
import { brokePromise } from "@/lib/ai/agents/draft";

function collectorMap(period: Period): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of readDemoCsv(period, "customers")) if (c.client_code && c.collector) m.set(String(c.client_code), String(c.collector));
  for (const f of engine(period).followUp) if (!m.has(f.client_code)) m.set(f.client_code, f.collector);
  return m;
}

export interface CollectorDigest {
  collector: string;
  toCall: { rank: number; client_code: string; client_name: string; overdue: number; reasonText: string }[];
  checksThisWeek: { client_code: string; client_name: string; check_no: string; amount: number; check_date: string }[];
  brokenPromises: { client_code: string; client_name: string; overdue: number }[];
  text: string;
}

export function buildDigest(period: Period) {
  const r = engine(period);
  const who = collectorMap(period);
  const collectors = [...new Set([...r.followUp.map((f) => f.collector), ...who.values()])].filter(Boolean).sort();
  const weekEnd = addDays(r.asOf, 7);
  const digests: CollectorDigest[] = collectors.map((collector) => {
    const mine = r.followUp.filter((f) => f.collector === collector);
    const toCall = mine.slice(0, 5).map((f) => ({ rank: f.rank, client_code: f.client_code, client_name: nameOf(f.client_code), overdue: f.overdue, reasonText: f.reasonText }));
    const checksThisWeek = r.pdcs
      .filter((p) => who.get(p.client_code) === collector && (p.week === 1 || (p.check_date >= r.asOf && p.check_date <= weekEnd)))
      .sort((a, b) => a.check_date.localeCompare(b.check_date))
      .map((p) => ({ client_code: p.client_code, client_name: nameOf(p.client_code), check_no: p.check_no, amount: p.amount, check_date: p.check_date }));
    const brokenPromises = mine.filter(brokePromise).map((f) => ({ client_code: f.client_code, client_name: nameOf(f.client_code), overdue: f.overdue }));
    const lines = [
      `Good morning, ${collector}! Here is your Duely brief for ${shortDate(r.asOf, true)}.`,
      "",
      `Top ${toCall.length} to call:`,
      ...toCall.map((t, i) => `${i + 1}. ${t.client_name} — ${peso(t.overdue)} overdue. ${t.reasonText}`),
      "",
      checksThisWeek.length ? "Checks to deposit this week:" : "No checks to deposit this week.",
      ...checksThisWeek.map((c) => `- ${shortDate(c.check_date)} · ${c.client_name} · ${c.check_no} · ${peso(c.amount)}`),
      "",
      brokenPromises.length ? "Broken promises to chase:" : "No broken promises.",
      ...brokenPromises.map((b) => `- ${b.client_name} — ${peso(b.overdue)} overdue`),
    ];
    return { collector, toCall, checksThisWeek, brokenPromises, text: lines.join("\n") };
  });
  return {
    period,
    asOf: r.asOf,
    subject: `Duely morning brief — ${shortDate(r.asOf, true)}`,
    digests,
    text: digests.map((d) => d.text).join("\n\n———\n\n"),
  };
}

export function buildDue(period: Period) {
  const r = engine(period);
  const until = addDays(r.asOf, 2);
  const who = collectorMap(period);
  const pdcsDue = r.pdcs
    .filter((p) => p.check_date >= r.asOf && p.check_date <= until)
    .map((p) => ({ client_code: p.client_code, client_name: nameOf(p.client_code), collector: who.get(p.client_code) ?? null, check_no: p.check_no, amount: p.amount, check_date: p.check_date }));
  const promises = new Map<string, { client_code: string; client_name: string; collector: string | null; amount: number; date: string }>();
  for (const f of r.followUp)
    if (f.openPromise?.date === r.asOf)
      promises.set(f.client_code, { client_code: f.client_code, client_name: nameOf(f.client_code), collector: f.collector, amount: f.openPromise.amount, date: f.openPromise.date });
  for (const a of readDemoCsv(period, "collection_activity")) {
    const code = String(a.client_code);
    if (a.promise_date === r.asOf && !promises.has(code))
      promises.set(code, { client_code: code, client_name: nameOf(code), collector: who.get(code) ?? null, amount: Number(a.promise_amount ?? 0), date: r.asOf });
  }
  const promisesDueToday = [...promises.values()];
  const text = [
    `Due reminders for ${shortDate(r.asOf, true)}:`,
    pdcsDue.length ? "PDCs due within 2 days:" : "No PDCs due within 2 days.",
    ...pdcsDue.map((p) => `- ${shortDate(p.check_date)} · ${p.client_name} · ${p.check_no} · ${peso(p.amount)}`),
    promisesDueToday.length ? "Promises to pay due today:" : "No promises due today.",
    ...promisesDueToday.map((p) => `- ${p.client_name} · ${peso(p.amount)}`),
  ].join("\n");
  return { period, asOf: r.asOf, pdcsDue, promisesDueToday, text };
}

export async function notifyDigest(d: ReturnType<typeof buildDigest>) {
  let n = 0;
  for (const c of d.digests) {
    await createNotification({ role: "collector", title: `${c.collector}: ${c.toCall.length} to call, ${c.checksThisWeek.length} checks this week`, body: c.text, link: "/today" });
    n++;
  }
  const broken = d.digests.reduce((a, c) => a + c.brokenPromises.length, 0);
  await createNotification({ role: "supervisor", title: `Morning brief sent to ${d.digests.length} collectors (${broken} broken promises)`, body: d.text, link: "/today" });
  return n + 1;
}

export async function notifyDue(d: ReturnType<typeof buildDue>) {
  let n = 0;
  for (const p of d.pdcsDue) {
    await createNotification({ role: "collector", title: `Deposit ${p.check_no} from ${p.client_name} (${peso(p.amount)}) on ${shortDate(p.check_date)}`, link: "/pdcs" });
    n++;
  }
  for (const p of d.promisesDueToday) {
    await createNotification({ role: "collector", title: `Promise due today: ${p.client_name} ${peso(p.amount)}`, link: `/clients/${p.client_code}` });
    n++;
  }
  return n;
}
