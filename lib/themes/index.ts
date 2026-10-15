// Theme registry. To add a theme: create lib/themes/<name>.ts exporting a Theme, then add it below.
import type { CSSProperties } from "react";
import type { Theme } from "./types";
import { wise } from "./wise";
import { wallet } from "./wallet";

export type { Theme, ThemeLayout, ThemeTokens } from "./types";

export const THEMES: Record<string, Theme> = {
  wise,
  wallet,
};

export const DEFAULT_THEME = "wise";
export const THEME_COOKIE = "duely_theme";

export function resolveTheme(name: string | null | undefined): Theme {
  return (name && THEMES[name]) || THEMES[DEFAULT_THEME];
}

/** Token map → inline CSS custom properties (applied on <html>). */
export function themeStyle(theme: Theme): CSSProperties {
  const out: Record<string, string> = { colorScheme: theme.layout.colorScheme };
  for (const [k, v] of Object.entries(theme.tokens)) out[`--${k}`] = v;
  if (theme.layout.avatarShape === "rounded") out["--radius-avatar"] = "14px";
  return out as CSSProperties;
}

/** Layout switches → data-* attributes on <html>; CSS in app/globals.css reacts to them. */
export function themeDataAttrs(theme: Theme): Record<string, string> {
  return {
    "data-theme": theme.name,
    "data-nav": theme.layout.navStyle,
    "data-hero": theme.layout.heroStyle,
    "data-list": theme.layout.listStyle,
    "data-scheme": theme.layout.colorScheme,
  };
}

export function themeList() {
  return Object.values(THEMES).map((t) => ({ name: t.name, label: t.label, description: t.description }));
}
