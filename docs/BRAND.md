# Duely brand: retrofit of the "duely design system" (16 Oct 2026)

Michael uploaded a separate design system export (logo "Talking receipt", green-black ink, mint accent, Plex Mono).
Decision: keep Duely's purple brand and layout; adopt only what fits or what we had not defined. Source copy of the guide:
`/mnt/project-files/branding/duely-design-system-v2/readme.md` (shared project folder, not in the repo).

| Area | Decision |
| --- | --- |
| Brand hue | Unchanged: primary #5B3FD0, lavender #AB9FF2, soft lilac #ECE8FB, our mint/amber/coral status colours. |
| Ink (near-black) | Adopted: `--ink` #10231C for body text, headings, dark chips and receipt content (was purple-black #1C1240). Purple gradients stay. |
| Logo | Primary lockup unchanged (check-d mark + "duely"). Companion mark = the receipt (`components/brand/ReceiptMark.tsx`): ink body, paper lines, mint last line. Used on login, landing footer, empty-month banner, draft letters. |
| Numbers, IDs, dates | Adopted: IBM Plex Mono with tabular numerals (`.mono`, `font-mono`) for invoice and check numbers; eyebrow labels in mono uppercase. Big hero amounts stay in the display face. |
| Receipt motif | Adopted: `.receipt` card (paper, soft shadow, 12px torn bottom) for reminder letters only, once per view; `.receipt-rule` dashed divider. |
| Status colours | Added the missing ones: sky = sent, ink = draft (`Chip tone="sky"` / `"ink"`). |
| Kept ours | Plus Jakarta Sans body, Bricolage display, pill buttons, 20px cards, purple focus ring, motion, peso coins, confetti. |
| Voice | Already matches (Friendly, Firm, Final; no emoji; sentence case). |
