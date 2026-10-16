"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parsePeriodValue, parseRoleChoice, PERIOD_COOKIE, ROLES, type Role } from "@/lib/session";
import { THEMES, THEME_COOKIE } from "@/lib/themes";

const YEAR = 60 * 60 * 24 * 365;
const opts = { path: "/", maxAge: YEAR, sameSite: "lax" as const };
// The month choice lasts for this visit only, so the app always reopens on the latest month.
const monthOpts = { path: "/", sameSite: "lax" as const };

/** Accepts a data period ("P1" / "P2") or a month key ("2026-10") inside the month range. */
export async function setPeriod(period: string) {
  const v = parsePeriodValue(period);
  if (!v) return;
  (await cookies()).set(PERIOD_COOKIE, v, monthOpts);
  revalidatePath("/", "layout");
}

/** Form action: switch to a month and open its dashboard (works without JS). */
export async function openMonthDashboard(formData: FormData) {
  const v = parsePeriodValue(formData.get("month"));
  if (v) (await cookies()).set(PERIOD_COOKIE, v, monthOpts);
  revalidatePath("/", "layout");
  const to = String(formData.get("to") ?? "/today");
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/today");
}

export async function setTheme(name: string) {
  if (!THEMES[name]) return;
  (await cookies()).set(THEME_COOKIE, name, opts);
  revalidatePath("/", "layout");
}

async function applyRole(role: Role, collector: string | null) {
  const jar = await cookies();
  jar.set("duely_role", role, opts);
  // Signing in or switching role starts on the latest month with data, not a month picked earlier.
  jar.delete(PERIOD_COOKIE);
  if (collector) jar.set("duely_collector", collector, opts);
  else jar.delete("duely_collector");
}

/** Demo sign-in: no password. Swap for Supabase auth later (keep the cookie names or adapt lib/session.ts). */
export async function signInAs(formData: FormData) {
  const choice = parseRoleChoice(formData.get("role"));
  if (!choice) return;
  await applyRole(choice.role, choice.collector);
  redirect(ROLES[choice.role].home);
}

export async function switchRole(role: string) {
  const choice = parseRoleChoice(role);
  if (!choice) return;
  await applyRole(choice.role, choice.collector);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete("duely_role");
  jar.delete("duely_collector");
  jar.delete(PERIOD_COOKIE);
  redirect("/login");
}
