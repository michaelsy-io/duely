import { cookies } from "next/headers";

export type Period = "P1" | "P2";
export type Role = "collector" | "supervisor" | "cfo" | "admin";

export const PERIODS: Record<Period, { asOf: string; label: string; short: string; folder: string }> = {
  P1: { asOf: "2026-08-31", label: "31 Aug 2026", short: "31 Aug", folder: "P1_2026-08-31" },
  P2: { asOf: "2026-09-30", label: "30 Sep 2026", short: "30 Sep", folder: "P2_2026-09-30" },
};

export const ROLES: Record<Role, { label: string; person: string; home: string }> = {
  collector: { label: "Collector 2", person: "Collector 2", home: "/today" },
  supervisor: { label: "Supervisor", person: "Supervisor", home: "/today" },
  cfo: { label: "CFO", person: "CFO", home: "/cfo" },
  admin: { label: "Admin", person: "Admin", home: "/today" },
};

export function isPeriod(v: unknown): v is Period {
  return v === "P1" || v === "P2";
}
export function isRole(v: unknown): v is Role {
  return typeof v === "string" && v in ROLES;
}

export async function getPeriodFromCookie(): Promise<Period> {
  const v = (await cookies()).get("duely_period")?.value;
  return isPeriod(v) ? v : "P1";
}

export interface Session {
  role: Role;
  roleLabel: string;
  /** Collector name when role is collector; otherwise null (sees everyone). */
  collector: string | null;
  signedIn: boolean;
}

/** Demo session from cookies. Swap for Supabase auth later; keep the shape. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const r = jar.get("duely_role")?.value;
  const role: Role = isRole(r) ? r : "supervisor";
  const collector = role === "collector" ? jar.get("duely_collector")?.value || "Collector 2" : null;
  return { role, roleLabel: role === "collector" && collector ? collector : ROLES[role].label, collector, signedIn: isRole(r) };
}
