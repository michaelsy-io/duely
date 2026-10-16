import { useId, type ReactNode } from "react";

/** The six demo sign-ins, by their "view as" id (see lib/session.ts roleChoiceId). */
export type AvatarId = "collector-1" | "collector-2" | "collector-3" | "supervisor" | "cfo" | "admin";

const INK = "#1C1240";
const CHEEK = "#E5484D";
const WHITE = "#FFFFFF";

interface Person {
  bg: string;
  skin: string;
  shirt: string;
  /** Drawn behind the head (ponytail, bun, curls). */
  back?: ReactNode;
  /** Drawn over the head (hair, hats, glasses). */
  front?: ReactNode;
  /** Drawn over the shoulders (collars, lanyards, phone). */
  outfit?: ReactNode;
}

const PEOPLE: Record<AvatarId, Person> = {
  // Agent 1: side-swept fringe, ponytail and a call headset.
  "collector-1": {
    bg: "#ECE8FB",
    skin: "#F2C7A5",
    shirt: "#5B3FD0",
    back: <path d="M41 19c9 1 11 13 6 22-1-6-4-11-8-14z" fill="#6B3E26" />,
    front: (
      <>
        <path d="M18.6 30c0-10 6-16 13.4-16s13.4 6 13.4 16c-5-1-10-4-12-9-3 5-9 8-14.8 9z" fill="#6B3E26" />
        <path d="M17 31a15 15 0 0 1 30 0" fill="none" stroke={INK} strokeWidth="2.4" />
        <rect x="14.5" y="27" width="5.5" height="9" rx="2.75" fill={INK} />
        <path d="M17.5 35c0 4.5 3 7 8 7" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="26" cy="42" r="1.9" fill="#2FBF8A" />
      </>
    ),
  },
  // Agent 2: mint baseball cap, brim to the side.
  "collector-2": {
    bg: "#FBDCDD",
    skin: "#A86F48",
    shirt: "#AB9FF2",
    front: (
      <>
        <path d="M19 22.5h8v3.5c-2.5 0-5 1.5-7.6 4.5-.6-2.6-.4-5.4-.4-8z" fill="#2B1D14" />
        <path d="M18.5 24c0-8 6-13.5 13.5-13.5S45.5 16 45.5 24z" fill="#2FBF8A" />
        <path d="M27 21.5h21.5a2.6 2.6 0 0 1 0 5.2H27z" fill="#1F9A6D" />
        <circle cx="32" cy="10.8" r="1.8" fill="#1F9A6D" />
      </>
    ),
  },
  // Agent 3: big curls and a phone at the ear.
  "collector-3": {
    bg: "#D3F2E5",
    skin: "#8D5A3B",
    shirt: "#E5484D",
    back: (
      <>
        <circle cx="32" cy="24" r="15.5" fill={INK} />
        <circle cx="19.5" cy="21" r="7" fill={INK} />
        <circle cx="44.5" cy="21" r="7" fill={INK} />
      </>
    ),
    front: <path d="M19.5 26c1-7 6-11 12.5-11s11.5 4 12.5 11c-4-3-8-4.5-12.5-4.5S23.5 23 19.5 26z" fill={INK} />,
    outfit: (
      <>
        <rect x="42" y="28.5" width="7.5" height="13" rx="2.2" fill={INK} />
        <rect x="43.4" y="30.5" width="4.7" height="7.4" rx="1" fill="#AB9FF2" />
        <rect x="41" y="38" width="9.5" height="6.5" rx="3.25" fill="#8D5A3B" />
      </>
    ),
  },
  // Supervisor: round glasses, silver side part, sweater over a collared shirt and tie.
  supervisor: {
    bg: "#AB9FF2",
    skin: "#E8B48F",
    shirt: "#5B3FD0",
    front: (
      <>
        <path d="M18.8 28c0-9 5.5-14 13.2-14s13.2 5 13.2 13c-6 0-11-2-14-6-2 3.5-7 6.5-12.4 7z" fill="#8F8AA3" />
        <circle cx="27" cy="30.5" r="4.4" fill="none" stroke={INK} strokeWidth="1.7" />
        <circle cx="37" cy="30.5" r="4.4" fill="none" stroke={INK} strokeWidth="1.7" />
        <path d="M31.4 30.5h1.2" stroke={INK} strokeWidth="1.7" />
      </>
    ),
    outfit: (
      <>
        <path d="M25 45l7 12 7-12-7 1.5z" fill={WHITE} />
        <path d="M30.4 47h3.2l-.6 2 1.4 7-2.4 2.6-2.4-2.6 1.4-7z" fill="#F5A524" />
      </>
    ),
  },
  // CFO: top bun, pearl earrings and a dark blazer over a white blouse.
  cfo: {
    bg: "#5B3FD0",
    skin: "#C98E63",
    shirt: INK,
    back: <circle cx="32" cy="12.5" r="6.2" fill="#2B1D14" />,
    front: (
      <>
        <path d="M18.6 30c0-10 6-16 13.4-16s13.4 6 13.4 16c-2-5.5-6.5-9-13.4-9s-11.4 3.5-13.4 9z" fill="#2B1D14" />
        <circle cx="19" cy="36" r="1.9" fill={WHITE} />
        <circle cx="45" cy="36" r="1.9" fill={WHITE} />
      </>
    ),
    outfit: (
      <>
        <path d="M26 45.5L32 57l6-11.5L32 47z" fill={WHITE} />
        <circle cx="32" cy="50.5" r="1.5" fill="#F5A524" />
      </>
    ),
  },
  // Admin: coral beanie with a pom, mint hoodie with drawstrings and a sticker.
  admin: {
    bg: "#FDEBC8",
    skin: "#F6D7C3",
    shirt: "#2FBF8A",
    front: (
      <>
        <path d="M19 25v6.5c1.2 1.5 2.4 2.4 3.4 2.6V25zM45 25v6.5c-1.2 1.5-2.4 2.4-3.4 2.6V25z" fill="#C8642E" />
        <path d="M18.2 24c0-8.5 6.2-14 13.8-14s13.8 5.5 13.8 14z" fill="#E5484D" />
        <rect x="16.8" y="21.2" width="30.4" height="5.6" rx="2.8" fill="#C43A3F" />
        <circle cx="32" cy="9.4" r="3.6" fill="#F5A524" />
      </>
    ),
    outfit: (
      <>
        <path d="M29.5 47v7M34.5 47v7" stroke={WHITE} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="44" cy="55" r="3.2" fill="#F5A524" />
      </>
    ),
  },
};

const ID_SET = new Set(Object.keys(PEOPLE));

/** Narrow a "view as" id ("collector-2", "cfo", ...) to an avatar id; unknown ids get the supervisor. */
export function avatarIdFor(id: string): AvatarId {
  return (ID_SET.has(id) ? id : "supervisor") as AvatarId;
}

/**
 * A flat, friendly head-and-shoulders avatar for one of the six demo accounts.
 * Decorative by default (aria-hidden); pass `title` to give it an accessible name.
 */
export function PersonAvatar({ id, size = 36, title, className }: { id: AvatarId; size?: number; title?: string; className?: string }) {
  const clip = `pa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const p = PEOPLE[id] ?? PEOPLE.supervisor;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <clipPath id={clip}><circle cx="32" cy="32" r="32" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={p.bg} />
        {/* Scaled up a touch around the chin so faces read at 28px. */}
        <g transform="translate(-3.84 -4.8) scale(1.12)">
        {p.back}
        <path d="M8 66c0-12 10-20 24-20s24 8 24 20z" fill={p.shirt} />
        <rect x="28" y="38" width="8" height="9" rx="3" fill={p.skin} />
        <circle cx="19.5" cy="31" r="2.6" fill={p.skin} />
        <circle cx="44.5" cy="31" r="2.6" fill={p.skin} />
        <circle cx="32" cy="29" r="13" fill={p.skin} />
        <circle cx="24" cy="35" r="2.5" fill={CHEEK} fillOpacity=".32" />
        <circle cx="40" cy="35" r="2.5" fill={CHEEK} fillOpacity=".32" />
        <circle cx="27" cy="30.5" r="1.9" fill={INK} />
        <circle cx="37" cy="30.5" r="1.9" fill={INK} />
        <path d="M29 35.6q3 2.8 6 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        {p.outfit}
        {p.front}
        </g>
      </g>
    </svg>
  );
}
