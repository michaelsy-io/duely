/** A Duely theme = semantic design tokens + a few layout switches. See docs/THEMES.md. */
export interface ThemeTokens {
  bg: string; // page background
  surface: string; // cards
  "surface-2": string; // subtle fills, selected rows, secondary pills
  "surface-3": string; // icon-button wells, hover
  border: string;
  fg: string; // main text
  "fg-muted": string; // grey sub-labels
  "fg-subtle": string; // tertiary text
  primary: string; // primary buttons, links, active nav
  "primary-hover": string;
  "primary-fg": string; // text on primary
  "primary-soft": string; // soft primary fill (secondary pills)
  "primary-soft-fg": string; // text on primary-soft
  accent: string; // highlight chips/buttons (Wise-lime role)
  "accent-fg": string;
  good: string; "good-soft": string; "good-fg": string;
  warn: string; "warn-soft": string; "warn-fg": string;
  bad: string; "bad-soft": string; "bad-fg": string;
  orange: string; "orange-soft": string; "orange-fg": string;
  "radius-card": string;
  "radius-pill": string;
  "radius-avatar": string;
  "shadow-card": string;
  "shadow-float": string; // floating buttons, popovers
  scrim: string; // overlay behind dialogs
  "font-sans": string;
  "font-display": string;
  density: string; // multiplier for vertical padding, e.g. "1"
  focus: string;
  "nav-bg": string; // sidebar / tab bar
  "nav-fg": string;
  "nav-active-bg": string;
  "nav-active-fg": string;
  "hero-bg": string; // balance hero card
  "hero-fg": string;
  "hero-muted": string;
  /** Avatar palette: 8 bg/fg pairs, picked by client code hash. */
  [k: `avatar-${number}-bg` | `avatar-${number}-fg`]: string;
}

export interface ThemeLayout {
  /** Desktop navigation. Phones always use the bottom tab bar. */
  navStyle: "sidebar" | "bottom-tabs";
  heroStyle: "centered-balance" | "left";
  listStyle: "rows" | "cards";
  avatarShape: "circle" | "rounded";
  colorScheme: "light" | "dark";
}

export interface Theme {
  name: string;
  label: string;
  description: string;
  tokens: ThemeTokens;
  layout: ThemeLayout;
}
