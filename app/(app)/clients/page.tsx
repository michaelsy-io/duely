import type { Metadata } from "next";
import { EmptyMonth } from "@/components/month/EmptyMonth";
import { getCurrentResult } from "@/lib/data";
import { getSession, getMonthSelection } from "@/lib/session";
import { customers, readTable } from "@/lib/demo-tables";
import { allClients, avatarColor, initials } from "@/lib/clients";
import { bucketTone, peso } from "@/lib/format";
import { ClientSearch, type ClientItem } from "./ClientSearch";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const sel = await getMonthSelection();
  if (!sel.period) return <EmptyMonth variant="clients" sel={sel} />;
  const [{ period, result }, session] = await Promise.all([getCurrentResult(), getSession()]);
  const [cust, aging] = await Promise.all([customers(period), readTable(period, "ar_aging")]);
  const byCode = Object.fromEntries(cust.map((c) => [c.client_code, c]));
  const bal: Record<string, number> = {};
  for (const r of aging) bal[r.client_code] = (bal[r.client_code] ?? 0) + Number(r.balance);
  const fu = Object.fromEntries(result.followUp.map((r) => [r.client_code, r]));

  const items: ClientItem[] = allClients()
    .filter((p) => !session.collector || byCode[p.client_code]?.collector === session.collector)
    .map((p) => {
      const f = fu[p.client_code];
      const c = avatarColor(p.client_code);
      return {
        code: p.client_code, name: p.name, initials: initials(p.client_code), bg: c.bg, fg: c.fg,
        segment: p.segment, area: p.area, collector: byCode[p.client_code]?.collector ?? "",
        balance: peso(bal[p.client_code] ?? 0), overdue: f ? peso(f.overdue) : null, overdueDays: f?.oldestDays ?? null, rank: f?.rank ?? null,
        tone: f ? bucketTone(f.oldestDays) : "",
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.code.localeCompare(b.code));

  return (
    <div>
      <h1 className="h-display text-4xl sm:text-5xl">Clients</h1>
      <p className="mb-6 mt-2 text-fg-muted">{session.collector ? `Your ${items.length} accounts.` : `All ${items.length} accounts.`} Overdue clients first, in follow-up order.</p>
      <ClientSearch items={items} />
    </div>
  );
}
