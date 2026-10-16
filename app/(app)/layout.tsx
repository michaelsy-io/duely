import { getCurrentResult } from "@/lib/data";
import { getMonthSelection, getSession, monthLabel, monthList, periodForMonth, PERIODS, ROLES } from "@/lib/session";
import { getTheme } from "@/lib/themes/server";
import { themeList } from "@/lib/themes";
import { clientName } from "@/lib/clients";
import { peso } from "@/lib/format";
import { Sidebar } from "@/components/shell/Sidebar";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { Header, type Notice } from "@/components/shell/Header";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { MotionProvider } from "@/components/motion/MotionProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ period, result }, session, theme, sel] = await Promise.all([getCurrentResult(), getSession(), getTheme(), getMonthSelection()]);
  // Empty month (no imported books): no alerts, since nothing has been computed for it.
  const live = sel.period !== null;

  const notices: Notice[] = [];
  if (live) for (const b of result.bouncedOpen) {
    notices.push({ id: `b-${b.client_code}`, title: `Bounced check: ${clientName(b.client_code)}`, body: `${peso(b.amount)} returned ${b.daysAgo} days ago, not replaced`, href: `/clients/${b.client_code}`, tone: "bad" });
  }
  const holds = result.escalations.filter((e) => /hold/i.test(e.action));
  if (live && holds.length) notices.push({ id: "holds", title: `${holds.length} credit-hold reviews`, body: holds.map((h) => clientName(h.client_code)).slice(0, 3).join(", ") + (holds.length > 3 ? "…" : ""), href: "/approvals", tone: "warn" });
  if (live && result.control.gap !== 0) notices.push({ id: "gap", title: "Ledger vs aging gap", body: `${peso(result.control.gap)} unapplied (${result.control.unappliedRefs.join(", ")})`, href: "/cfo", tone: "primary" });
  const drop = result.flags.find((f) => f.flag === "Inflow drop");
  if (live && drop) notices.push({ id: "inflow", title: `Inflow dip in ${drop.who}`, body: drop.rule, href: "/cfo", tone: "warn" });

  // Demo clock: the day is the books' as-of date and the time is always 9:00, so the greeting never
  // mixes in the real wall-clock time.
  const DEMO_HOUR = 9;
  const greeting = `${DEMO_HOUR < 12 ? "Good morning" : "Good afternoon"} · ${live ? PERIODS[period].label : `${sel.short} · no data yet`}`;

  return (
    <MotionProvider>
      <div className="min-h-dvh bg-bg">
        <Sidebar periodLabel={live ? PERIODS[period].label : `${sel.label} (no data yet)`} source={result.source} role={session.role} />
        <div className="app-content lg:ml-64">
          <Header
            greeting={greeting}
            name={session.role === "collector" ? "Hi, Collecting Agent" : session.role === "cfo" ? "Hi, CFO" : session.role === "admin" ? "Hi, Admin" : "Hi, Supervisor"}
            role={session.roleLabel}
            roleId={session.role}
            home={ROLES[session.role].home}
            selected={sel.period ?? sel.month}
            periods={[{ id: "P2", short: PERIODS.P2.short }, { id: "P1", short: PERIODS.P1.short }]} // latest month first
            months={monthList().map((m) => {
              const p = periodForMonth(m);
              return { value: p ?? m, label: monthLabel(m), short: monthLabel(m, true).slice(0, 3), note: p ? `Books as of ${PERIODS[p].label}` : "No data yet" };
            })}
            themes={themeList()}
            theme={theme.name}
            notices={notices}
          />
          <main id="main" className="app-main mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8">{children}</main>
        </div>
        <BottomTabs role={session.role} />
        <ChatLauncher period={period} />
      </div>
    </MotionProvider>
  );
}
