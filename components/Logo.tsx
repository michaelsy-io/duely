import clsx from "clsx";

/** Duely mark: rounded purple square with a check-shaped "d" (a bowl plus a tick whose long stroke is the ascender). */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#5B3FD0" />
      <circle cx="13.2" cy="18.6" r="5.6" fill="none" stroke="#C9BDFF" strokeWidth="3" />
      <path d="M10.4 18.4l2.9 2.9L22.6 7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.045em]">duely</span>
    </span>
  );
}
