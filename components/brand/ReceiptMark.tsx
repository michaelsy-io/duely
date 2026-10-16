/**
 * Duely's companion mark, the "talking receipt": a receipt whose torn edge ends in a speech tail.
 * Adopted from the duely design system export (16 Oct 2026), recoloured for Duely: receipt-ink body,
 * paper lines, and a mint last line for "money coming in". The main logo stays the check-d (components/Logo.tsx).
 */
const PATH = "M14 6 H52 Q56 6 56 10 V46 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 L10 58 V10 Q10 6 14 6 Z";

export function ReceiptMark({ size = 32, tone = "ink", className, title }: { size?: number; tone?: "ink" | "inverse" | "primary"; className?: string; title?: string }) {
  const body = tone === "inverse" ? "#F6F3FF" : tone === "primary" ? "#5B3FD0" : "#10231C";
  const line = tone === "inverse" ? "#10231C" : "#FFFDF6";
  const accent = tone === "inverse" ? "#2FBF8A" : "#5FE3A1";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={PATH} fill={body} />
      <rect x="18" y="15" width="30" height="4" rx="2" fill={line} />
      <rect x="18" y="24" width="20" height="4" rx="2" fill={line} opacity={tone === "inverse" ? 0.45 : 0.55} />
      <rect x="18" y="33" width="12" height="4" rx="2" fill={accent} />
    </svg>
  );
}
