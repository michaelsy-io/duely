# Duely themes

Duely's UI is skinnable. A **theme** is one TypeScript file: a set of semantic design tokens plus a few layout switches. Components never use raw colours; they use token utilities such as `bg-surface`, `text-fg-muted`, `bg-primary text-primary-fg`, `rounded-card`.

Shipped themes:

| name | look |
| --- | --- |
| `wise` (default) | Wise mobile app inspired: light, airy, big centred balance, round action buttons, clean rows. Regal purple `#5B3FD0`, ink `#1C1240`. |
| `wallet` | Dark "crypto wallet" look: ground `#1E1D24`, cards `#2A2933`, lavender primary `#AB9FF2` with dark text, list rows as separate cards. |

## Switching

- In the app: role menu (top right) → **App style**.
- By URL: add `?theme=wallet` to any page (stored in the `duely_theme` cookie by `middleware.ts`).
- Default: `DEFAULT_THEME` in `lib/themes/index.ts`.

## Add a theme (e.g. to mimic another app)

1. Copy `lib/themes/wise.ts` to `lib/themes/<name>.ts` and rename the export.
2. Change the tokens (see the table below). Keep every key; TypeScript will tell you if one is missing.
3. Set the layout switches:
   - `navStyle`: `"sidebar"` (desktop left nav) or `"bottom-tabs"` (tab bar at every width, like a phone app). Phones always get bottom tabs.
   - `heroStyle`: `"centered-balance"` (Wise/Revolut style big centred number) or `"left"` (left-aligned, dashboard feel).
   - `listStyle`: `"rows"` (one card with divided rows) or `"cards"` (each row its own card, wallet style).
   - `avatarShape`: `"circle"` or `"rounded"` (rounded square).
   - `colorScheme`: `"light"` or `"dark"` (form controls, scrollbars).
4. Register it in `lib/themes/index.ts`: import it and add it to `THEMES`. That is the only other change; the picker lists it automatically.
5. Try it: `/today?theme=<name>`.

## Tokens

| token | used for |
| --- | --- |
| `bg` | page background |
| `surface`, `surface-2`, `surface-3` | cards; subtle fills / hover; icon wells and segmented controls |
| `border` | 1px card and row borders |
| `fg`, `fg-muted`, `fg-subtle` | main text; grey sub-labels; tertiary hints |
| `primary`, `primary-hover`, `primary-fg` | primary buttons, active states, text on primary |
| `primary-soft`, `primary-soft-fg` | secondary pills and selected rows |
| `accent`, `accent-fg` | highlight chips/buttons (the Wise lime role; lavender here) |
| `good` / `warn` / `bad` / `orange` + `-soft` + `-fg` | status colours: solid, soft background, readable text on the soft background |
| `nav-bg`, `nav-fg`, `nav-active-bg`, `nav-active-fg` | sidebar and bottom tab bar |
| `hero-bg`, `hero-fg`, `hero-muted` | the big balance card |
| `avatar-N-bg`, `avatar-N-fg` (N = 0..7) | initials avatars, picked by client code |
| `radius-card`, `radius-pill`, `radius-avatar` | corner radii |
| `shadow-card` | card shadow (`none` for a flat look; wise uses the landing page's soft lift) |
| `shadow-float` | floating chat button, menus, sheets |
| `scrim` | dimmed overlay behind dialogs |
| `font-sans`, `font-display` | UI font and heading/number font (`--font-jakarta`, `--font-bricolage` are loaded in `app/layout.tsx`; add more fonts there with `next/font`) |
| `density` | multiplier for list-row vertical padding (`0.85` compact, `1.2` roomy) |
| `focus` | focus ring colour |

## How it works

- `app/layout.tsx` reads the theme (`lib/themes/server.ts`), writes the tokens as CSS variables on `<html style>` and the layout switches as `data-nav`, `data-hero`, `data-list`, `data-scheme`.
- `app/globals.css` maps the variables to Tailwind colours (`@theme inline`) and holds the small CSS blocks that react to the `data-*` switches (`.balance-hero`, `.list-group`, `.app-sidebar`, `.app-bottomtabs`).
- Reusable pieces live in `components/ui/` (`BalanceHero`, `ActionButton`, `ListRow`/`ListGroup`, `StatPill`, `Chip`, `Card`, `Avatar`) and `components/shell/` (`Sidebar`, `BottomTabs`, `Header`). They only use tokens, so a new theme restyles every page.
- The public landing page (`/`) has its own art direction (`app/_landing/landing.css`) and is not themed.

## Rules for new UI code

- No hex/rgb in components. Use token utilities (`bg-good-soft text-good-fg`) or `var(--token)` in inline styles.
- Charts: use `var(--primary)`, `var(--accent)`, status tokens; see `bucketColor()` in `lib/format.ts`.
- Lists: wrap rows in `<ListGroup>` so `listStyle` applies.
