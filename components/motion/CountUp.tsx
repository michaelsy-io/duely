"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "motion/react";
import clsx from "clsx";
import { peso, pesoShort, pct } from "@/lib/format";
import { EASE_OUT, isHydrated, prefersReducedMotion } from "./env";

export type CountFormat = "peso" | "pesoShort" | "pct" | "int" | "fixed";

function formatter(format: CountFormat, digits: number): (n: number) => string {
  switch (format) {
    case "peso": return peso;
    case "pesoShort": return pesoShort;
    case "pct": return (n) => pct(n, digits);
    case "fixed": return (n) => n.toFixed(digits);
    case "int": return (n) => String(Math.round(n));
  }
}

/** A hard page load counts up only if hydration happens soon after the page appeared. */
const HARD_LOAD_WINDOW_MS = 2500;

/**
 * Counts a number up to its final value (~0.8s, ease-out).
 *
 * `text` is the exact final string the server already renders (e.g. peso(n)); it is
 * what the server sends, what no-JS users see, and what the animation always ends on.
 * Intermediate frames use `format` and are written straight to the DOM (no re-renders).
 * An invisible copy of `text` reserves the final width, so nothing shifts.
 */
export function CountUp({ value, text, format, digits = 1, from = 0, duration = 0.8, className }: {
  value: number; text: string; format: CountFormat; digits?: number; from?: number; duration?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);
  const shown = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = formatter(format, digits);
    let start: number | null = prev.current;
    if (start === null) start = isHydrated() || performance.now() < HARD_LOAD_WINDOW_MS ? from : null;

    if (start === null || start === value || !Number.isFinite(value) || prefersReducedMotion()) {
      el.textContent = text;
      prev.current = shown.current = value;
      return;
    }
    shown.current = start;
    el.textContent = fmt(start);
    const controls = animate(start, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => { shown.current = v; el.textContent = fmt(v); },
      onComplete: () => { shown.current = value; el.textContent = text; },
    });
    // On cleanup (prop change, or StrictMode re-run) continue from what is on screen now.
    return () => { controls.stop(); prev.current = shown.current; el.textContent = text; };
  }, [value, text, format, digits, from, duration]);

  return (
    <span className={clsx("inline-grid", className)}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{text}</span>
      <span ref={ref} className="col-start-1 row-start-1">{text}</span>
    </span>
  );
}
