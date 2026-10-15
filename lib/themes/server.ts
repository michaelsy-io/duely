import { cookies } from "next/headers";
import { resolveTheme, THEME_COOKIE, type Theme } from "./index";

export async function getTheme(): Promise<Theme> {
  return resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
}
