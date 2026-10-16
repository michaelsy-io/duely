"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { PressButton, PressLink, press } from "@/components/motion/Press";

/** Wise-style round icon button with a label underneath (Send / Add / Request → Call / Log / Checks / Ask). */
export function ActionButton({
  icon, label, href, onClickId, variant = "soft", className, external,
}: { icon: ReactNode; label: string; href?: string; onClickId?: string; variant?: "soft" | "primary" | "accent"; className?: string; external?: boolean }) {
  const well = clsx(
    "grid size-12 place-items-center sm:size-14 rounded-full transition-transform group-hover:-translate-y-0.5 [&_svg]:size-5 sm:[&_svg]:size-6",
    variant === "primary" && "bg-primary text-primary-fg",
    variant === "accent" && "bg-accent text-accent-fg",
    variant === "soft" && "bg-surface-3 text-primary-soft-fg",
  );
  const inner = (
    <>
      <span className={well}>{icon}</span>
      <span className="text-xs font-semibold text-fg sm:text-[13px]">{label}</span>
    </>
  );
  const cls = clsx("group flex min-w-[54px] flex-col items-center gap-1.5 sm:min-w-[64px] sm:gap-2 rounded-2xl p-1", className);
  if (href && external) return <motion.a href={href} className={cls} {...press}>{inner}</motion.a>;
  if (href) return <PressLink href={href} className={cls}>{inner}</PressLink>;
  return (
    <PressButton type="button" className={cls} data-action={onClickId}>
      {inner}
    </PressButton>
  );
}
