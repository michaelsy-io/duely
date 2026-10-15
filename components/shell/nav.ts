import { CalendarCheck2, CheckCheck, Home, LineChart, MessageCircle, Upload, Users } from "lucide-react";

export const NAV = [
  { href: "/today", label: "Today", icon: Home, tab: true },
  { href: "/clients", label: "Clients", icon: Users, tab: true },
  { href: "/checks", label: "Checks", icon: CalendarCheck2, tab: true },
  { href: "/approvals", label: "Approvals", icon: CheckCheck, tab: true },
  { href: "/cfo", label: "CFO view", icon: LineChart, tab: true },
  { href: "/import", label: "Import", icon: Upload, tab: false },
  { href: "/ask", label: "Ask Duely", icon: MessageCircle, tab: false },
] as const;
