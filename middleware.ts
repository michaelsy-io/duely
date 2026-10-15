import { NextResponse, type NextRequest } from "next/server";
import { THEMES, THEME_COOKIE } from "@/lib/themes";

/** ?theme=<name> previews a theme: it is stored in the duely_theme cookie for this and later requests. */
export function middleware(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("theme");
  if (!t || !THEMES[t]) return NextResponse.next();
  req.cookies.set(THEME_COOKIE, t);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(THEME_COOKIE, t, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
