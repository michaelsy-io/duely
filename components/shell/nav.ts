import { CalendarCheck2, CalendarDays, CheckCheck, Home, LineChart, MessageCircle, NotebookPen, Upload, Users } from "lucide-react";
import type { Role } from "@/lib/session";

export const NAV_ITEMS = {
  today: { href: "/today", label: "Today", short: "Today", icon: Home },
  log: { href: "/log", label: "Log contact", short: "Log", icon: NotebookPen },
  clients: { href: "/clients", label: "Clients", short: "Clients", icon: Users },
  checks: { href: "/checks", label: "Checks", short: "Checks", icon: CalendarCheck2 },
  approvals: { href: "/approvals", label: "Approvals", short: "Approvals", icon: CheckCheck },
  cfo: { href: "/cfo", label: "CFO view", short: "CFO", icon: LineChart },
  calendar: { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  import: { href: "/import", label: "Import", short: "Import", icon: Upload },
  ask: { href: "/ask", label: "Ask Duely", short: "Ask", icon: MessageCircle },
} as const;

export type NavId = keyof typeof NAV_ITEMS;
export type NavItem = (typeof NAV_ITEMS)[NavId] & { id: NavId };

/** What each role sees, in order. The first item is the role's home. */
const ROLE_NAV: Record<Role, NavId[]> = {
  collector: ["today", "log", "clients", "checks", "calendar"],
  supervisor: ["today", "approvals", "log", "clients", "checks", "calendar"],
  cfo: ["cfo", "approvals", "today", "clients", "checks", "calendar"],
  admin: ["today", "approvals", "log", "clients", "checks", "cfo", "calendar", "import"],
};

/** One line on what each role can do (header role menu). */
export const ROLE_BLURB: Record<Role, string> = {
  collector: "Call list, checks and logging for your own clients.",
  supervisor: "Approves every draft before it reaches a client.",
  cfo: "Cash, aging and risk at a glance. Signs off final notices.",
  admin: "Everything, plus the month-end import and settings.",
};

export function navFor(role: Role): NavItem[] {
  return ROLE_NAV[role].map((id) => ({ id, ...NAV_ITEMS[id] }));
}

/** Pages a role is sent away from (to its home, ROLES[role].home) when opened directly.
 * Import is the Admin's month-end job, so everyone else is blocked from it. */
export const ROLE_BLOCKED: Record<Role, string[]> = {
  collector: ["/cfo", "/import"],
  supervisor: ["/import"],
  cfo: ["/import", "/log"],
  admin: [],
};

/** True when this role may not open the page at `href` (or anything under it). */
export function isBlocked(role: Role, href: string) {
  return ROLE_BLOCKED[role].some((b) => isActive(href, b));
}

/**
 * Mobile bottom tabs: at most 5. Roles with 5 or fewer items get them all; others get their
 * first four and a "More" tab holding the rest. Ask Duely is the floating button, not a tab.
 */
export function tabsFor(role: Role): { tabs: NavItem[]; more: NavItem[] } {
  const all = navFor(role);
  if (all.length <= 5) return { tabs: all, more: [] };
  return { tabs: all.slice(0, 4), more: all.slice(4) };
}

export function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}
