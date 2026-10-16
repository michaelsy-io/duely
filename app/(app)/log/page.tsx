import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { isBlocked } from "@/components/shell/nav";
import { getCurrentResult } from "@/lib/data";
import { getMonthSelection, getSession, ROLES } from "@/lib/session";
import { customers } from "@/lib/demo-tables";
import { allClients, avatarColor, initials } from "@/lib/clients";
import { bucketTone, peso } from "@/lib/format";
import { LogPicker, type LogClient } from "./LogPicker";

export const metadata: Metadata = { title: "Log contact" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [sel, session, sp] = await Promise.all([getMonthSelection(), getSession(), searchParams]);
  // The CFO reviews; logging calls is for the people who make them.
  if (isBlocked(session.role, "/log")) redirect(ROLES[session.role].home);
  if (!sel.period) return <EmptyMonth variant="log" sel={sel} canImport={session.role === "admin"} />;

  const { period, result } = await getCurrentResult();
  const cust = await customers(period);
  const byCode = Object.fromEntries(cust.map((c) => [c.client_code, c]));
  const fu = Object.fromEntries(result.followUp.map((r) => [r.client_code, r]));

  // Same scope and order as the Clients page: agents see only their own clients, follow-up rank first.
  const items: LogClient[] = allClients()
    .filter((p) => !session.collector || byCode[p.client_code]?.collector === session.collector)
    .map((p) => {
      const f = fu[p.client_code];
      const c = avatarColor(p.client_code);
      return {
        code: p.client_code, name: p.name, area: p.area, segment: p.segment, initials: initials(p.client_code), bg: c.bg, fg: c.fg,
        overdue: f ? peso(f.overdue) : null, overdueDays: f?.oldestDays ?? null, rank: f?.rank ?? null, tone: f ? bucketTone(f.oldestDays) : "",
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.code.localeCompare(b.code));

  const pre = typeof sp.c === "string" ? sp.c.toUpperCase() : null;
  const initial = pre && items.some((i) => i.code === pre) ? pre : null;

  return (
    <div>
      <h1 className="h-display text-4xl sm:text-5xl">Log contact</h1>
      <p className="mb-6 mt-2 text-fg-muted">Pick a client, then record the call, SMS, email or visit. {session.collector ? `Your ${items.length} accounts` : `All ${items.length} accounts`}, in follow-up order.</p>
      <LogPicker items={items} initial={initial} period={period} by={session.roleLabel} />
    </div>
  );
}
