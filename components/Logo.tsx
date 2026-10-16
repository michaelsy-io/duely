import clsx from "clsx";

/** Duely mark: rounded purple square with a check-shaped "d" (a bowl plus a tick whose long stroke is the ascender). */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={clsx("shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#5B3FD0" />
      <circle cx="13.2" cy="18.6" r="5.6" fill="none" stroke="#C9BDFF" strokeWidth="3" />
      <path d="M10.4 18.4l2.9 2.9L22.6 7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
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
