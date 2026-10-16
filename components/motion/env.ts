/**
 * Tiny shared motion helpers (no React). Keeps the "has the app hydrated yet?" flag
 * so count-ups can tell a hard page load (server already painted the final value)
 * from a client-side navigation (we can start from 0 with no flash).
 */
let hydrated = false;

export function markHydrated() {
  hydrated = true;
}

export function isHydrated() {
  return hydrated;
}

/** True when the OS asks for reduced motion. Safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Shared timings: fast and subtle, springs without big overshoot. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const SPRING_SOFT = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
export const SPRING_PRESS = { type: "spring", stiffness: 600, damping: 32 } as const;
