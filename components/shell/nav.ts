import { CalendarCheck2, CalendarDays, CheckCheck, Home, LineChart, MessageCircle, Upload, Users } from "lucide-react";
import type { Role } from "@/lib/session";

export const NAV_ITEMS = {
  today: { href: "/today", label: "Today", short: "Today", icon: Home },
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
  collector: ["today", "clients", "checks", "calendar", "ask"],
  supervisor: ["today", "approvals", "clients", "checks", "calendar", "import", "ask"],
  cfo: ["cfo", "approvals", "today", "clients", "checks", "calendar", "ask"],
  admin: ["today", "approvals", "clients", "checks", "cfo", "calendar", "import", "ask"],
};

/** One line on what each role can do (header role menu). */
export const ROLE_BLURB: Record<Role, string> = {
  collector: "Call list, checks and logging for your own clients.",
  supervisor: "Approves every draft before it reaches a client.",
  cfo: "Cash, aging and risk at a glance. Signs off final notices.",
  admin: "Everything, plus imports and settings.",
};

export function navFor(role: Role): NavItem[] {
  return ROLE_NAV[role].map((id) => ({ id, ...NAV_ITEMS[id] }));
}

/** Pages a role is sent away from (to /today) when opened directly. */
export const ROLE_BLOCKED: Record<Role, string[]> = {
  collector: ["/cfo", "/import"],
  supervisor: [],
  cfo: [],
  admin: [],
};

/**
 * Mobile bottom tabs: at most 5. Roles with 5 or fewer items get them all; others get their
 * first three, Ask, and a "More" tab holding the rest (so Ask and Calendar are always reachable).
 */
export function tabsFor(role: Role): { tabs: NavItem[]; more: NavItem[] } {
  const all = navFor(role);
  if (all.length <= 5) return { tabs: all, more: [] };
  const ask = all.find((n) => n.id === "ask");
  const rest = all.filter((n) => n.id !== "ask");
  return { tabs: [...rest.slice(0, 3), ...(ask ? [ask] : [])], more: rest.slice(3) };
}

export function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}
