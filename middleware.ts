import { NextResponse, type NextRequest } from "next/server";
import { THEMES, THEME_COOKIE } from "@/lib/themes";
import { isRole, ROLES } from "@/lib/session";
import { isBlocked } from "@/components/shell/nav";

/**
 * Sends a role away from pages it may not open (ROLE_BLOCKED, e.g. /import for everyone but the Admin)
 * with a real redirect to its home page. The pages also redirect, as a backstop.
 * ?theme=<name> previews a theme: it is stored in the duely_theme cookie for this and later requests.
 */
export function middleware(req: NextRequest) {
  const r = req.cookies.get("duely_role")?.value;
  const role = isRole(r) ? r : "supervisor";
  if (isBlocked(role, req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = ROLES[role].home;
    url.search = "";
    return NextResponse.redirect(url);
  }
  const t = req.nextUrl.searchParams.get("theme");
  if (!t || !THEMES[t]) return NextResponse.next();
  req.cookies.set(THEME_COOKIE, t);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(THEME_COOKIE, t, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
