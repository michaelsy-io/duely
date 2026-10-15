import clsx from "clsx";
import type { ReactNode } from "react";

export type Tone = "neutral" | "primary" | "accent" | "good" | "warn" | "orange" | "bad";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  primary: "bg-primary-soft text-primary-soft-fg",
  accent: "bg-accent text-accent-fg",
  good: "bg-good-soft text-good-fg",
  warn: "bg-warn-soft text-warn-fg",
  orange: "bg-orange-soft text-orange-fg",
  bad: "bg-bad-soft text-bad-fg",
};

export function Chip({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-bold", TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function toneClass(tone: Tone) {
  return TONES[tone];
}
