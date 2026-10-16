"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { markHydrated } from "./env";

/**
 * App-shell motion settings. reducedMotion="user" makes every motion component
 * skip transform/layout animation when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => { markHydrated(); }, []);
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
