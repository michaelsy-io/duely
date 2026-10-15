"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isPeriod, isRole, ROLES, type Role } from "@/lib/session";
import { THEMES, THEME_COOKIE } from "@/lib/themes";

const YEAR = 60 * 60 * 24 * 365;
const opts = { path: "/", maxAge: YEAR, sameSite: "lax" as const };

export async function setPeriod(period: string) {
  if (!isPeriod(period)) return;
  (await cookies()).set("duely_period", period, opts);
  revalidatePath("/", "layout");
}

export async function setTheme(name: string) {
  if (!THEMES[name]) return;
  (await cookies()).set(THEME_COOKIE, name, opts);
  revalidatePath("/", "layout");
}

async function applyRole(role: Role) {
  const jar = await cookies();
  jar.set("duely_role", role, opts);
  if (role === "collector") jar.set("duely_collector", "Collector 2", opts);
  else jar.delete("duely_collector");
}

/** Demo sign-in: no password. Swap for Supabase auth later (keep the cookie names or adapt lib/session.ts). */
export async function signInAs(formData: FormData) {
  const role = formData.get("role");
  if (!isRole(role)) return;
  await applyRole(role);
  redirect(ROLES[role].home);
}

export async function switchRole(role: string) {
  if (!isRole(role)) return;
  await applyRole(role);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete("duely_role");
  jar.delete("duely_collector");
  redirect("/login");
}
