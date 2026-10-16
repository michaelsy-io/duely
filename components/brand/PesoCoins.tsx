import type { CSSProperties } from "react";
import clsx from "clsx";

/** One lavender peso coin, the landing hero's coin motif in flat SVG (decorative). */
function Coin({ size, rotate, delay, className }: { size: number; rotate: number; delay: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={clsx("peso-coin absolute", className)}
      style={{ "--r": `${rotate}deg`, "--d": `${delay}s` } as CSSProperties}
    >
      <circle cx="20" cy="22.5" r="16.5" fill="#5B3FD0" />
      <circle cx="20" cy="19.5" r="16.5" fill="#AB9FF2" />
      <circle cx="20" cy="19.5" r="12.2" fill="none" stroke="#1C1240" strokeOpacity=".16" strokeWidth="1.6" />
      <path d="M16.5 27V12.5h4.6a4.3 4.3 0 0 1 0 8.6h-4.6M13.5 15.4h13M13.5 18.4h13" fill="none" stroke="#1C1240" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small pile of peso coins peeking out of a hero card's bottom-right corner. The parent must be `relative` and clip overflow. */
export function PesoCoins({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={clsx("pointer-events-none absolute bottom-0 right-0 block h-12 w-28", className)}>
      <Coin size={40} rotate={-16} delay={0} className="-bottom-3.5 right-11" />
      <Coin size={30} rotate={14} delay={-2} className="-bottom-1 right-3" />
      <Coin size={22} rotate={-6} delay={-4} className="bottom-6 right-8 opacity-90 lg:hidden" />
    </span>
  );
}
