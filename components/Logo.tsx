import clsx from "clsx";

/** Duely mark: the torn receipt (its torn edge ends in a speech tail), white paper with purple outline and lines. */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={clsx("shrink-0", className)} aria-hidden="true">
      <path d="M14 6 H52 Q56 6 56 10 V46 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 L10 58 V10 Q10 6 14 6 Z" fill="#fff" stroke="#5B3FD0" strokeWidth="4" strokeLinejoin="round" />
      <rect x="18" y="15" width="30" height="5" rx="2.5" fill="#5B3FD0" />
      <rect x="18" y="25" width="20" height="5" rx="2.5" fill="#5B3FD0" />
      <rect x="18" y="35" width="12" height="5" rx="2.5" fill="#5B3FD0" />
    </svg>
  );
}

/**
 * The Duely lockup, the single source for the landing page nav, the app sidebar, the phone header and login:
 * 30px mark, 10px gap, "duely" in Bricolage Grotesque 800 at 21px with -0.04em tracking (styles: `.duely-logo` in
 * app/globals.css, independent of the app theme so the wordmark never changes face).
 * `wordmarkClassName` lets a tight spot hide the word visually (it stays for screen readers).
 */
export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={clsx("duely-logo", className)}>
      <LogoMark size={30} />
      <span className={wordmarkClassName}>duely</span>
    </span>
  );
}
