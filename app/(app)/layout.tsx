import { getCurrentResult } from "@/lib/data";
import { getSession, PERIODS } from "@/lib/session";
import { getTheme } from "@/lib/themes/server";
import { themeList } from "@/lib/themes";
import { clientName } from "@/lib/clients";
import { peso } from "@/lib/format";
import { Sidebar } from "@/components/shell/Sidebar";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { Header, type Notice } from "@/components/shell/Header";
import { ChatLauncher } from "@/components/chat/ChatLauncher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ period, result }, session, theme] = await Promise.all([getCurrentResult(), getSession(), getTheme()]);

  const notices: Notice[] = [];
  for (const b of result.bouncedOpen) {
    notices.push({ id: `b-${b.client_code}`, title: `Bounced check: ${clientName(b.client_code)}`, body: `${peso(b.amount)} returned ${b.daysAgo} days ago, not replaced`, href: `/clients/${b.client_code}`, tone: "bad" });
  }
  const holds = result.escalations.filter((e) => /hold/i.test(e.action));
  if (holds.length) notices.push({ id: "holds", title: `${holds.length} credit-hold reviews`, body: holds.map((h) => clientName(h.client_code)).slice(0, 3).join(", ") + (holds.length > 3 ? "…" : ""), href: "/approvals", tone: "warn" });
  if (result.control.gap !== 0) notices.push({ id: "gap", title: "Ledger vs aging gap", body: `${peso(result.control.gap)} unapplied (${result.control.unappliedRefs.join(", ")})`, href: "/cfo", tone: "primary" });
  const drop = result.flags.find((f) => f.flag === "Inflow drop");
  if (drop) notices.push({ id: "inflow", title: `Inflow dip in ${drop.who}`, body: drop.rule, href: "/cfo", tone: "warn" });

  const hour = 9; // demo clock: morning
  const greeting = `${hour < 12 ? "Good morning" : "Good afternoon"} · ${PERIODS[period].label}`;

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar periodLabel={PERIODS[period].label} source={result.source} />
      <div className="app-content lg:ml-64">
        <Header
          greeting={greeting}
          name={session.role === "collector" ? `Hi, ${session.collector}` : session.role === "cfo" ? "Hi, CFO" : session.role === "admin" ? "Hi, Admin" : "Hi, Supervisor"}
          role={session.roleLabel}
          period={period}
          periods={[{ id: "P1", short: PERIODS.P1.short }, { id: "P2", short: PERIODS.P2.short }]}
          themes={themeList()}
          theme={theme.name}
          notices={notices}
        />
        <main id="main" className="app-main mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8">{children}</main>
      </div>
      <BottomTabs />
      <ChatLauncher period={period} />
    </div>
  );
}
