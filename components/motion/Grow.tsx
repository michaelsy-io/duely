"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "./env";

/**
 * A chart bar that grows from its base the first time it scrolls into view (once).
 * Size/colour come from `style`/`className` exactly as before; only scale animates.
 */
export function GrowBar({ axis = "x", delay = 0, className, style, title, as = "span", children }: {
  axis?: "x" | "y"; delay?: number; className?: string; style?: CSSProperties; title?: string; as?: "span" | "div"; children?: ReactNode;
}) {
  const M = as === "div" ? motion.div : motion.span;
  return (
    <M
      className={className}
      title={title}
      style={{ ...style, transformOrigin: axis === "x" ? "left center" : "center bottom" }}
      initial={axis === "x" ? { scaleX: 0 } : { scaleY: 0 }}
      whileInView={axis === "x" ? { scaleX: 1 } : { scaleY: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </M>
  );
}

/** A block (e.g. a week column) that rises and fades in the first time it scrolls into view (once). */
export function RevealOnView({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
