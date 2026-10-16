"use client";

import { Children, isValidElement, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

const STAGGER_CAP = 10; // 30ms per row (see .stagger-in in globals.css), never more than ~300ms

/**
 * A list whose rows:
 * - stagger in on first load (CSS, so it runs before hydration and without JS),
 * - slide into their new place when a filter changes (`layout`),
 * - fade out when filtered away, and fade in when they come back.
 *
 * Children must have stable `key`s (e.g. client code). Works with server-rendered rows.
 */
export function AnimatedList({ children, className, label, itemClassName, itemRole = "listitem" }: {
  children: ReactNode; className?: string; label?: string; itemClassName?: string; itemRole?: string;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  // Rows present at first render get the CSS stagger; rows added later animate via motion.
  const [firstKeys] = useState(() => new Set(items.map((c) => String(c.key))));
  // Only animate positions when the set/order of rows changes, not when something above shifts.
  const order = items.map((c) => String(c.key)).join("|");

  return (
    <div className={clsx("relative", className)} role="list" aria-label={label}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((child, i) => {
          const key = String(child.key);
          const first = firstKeys.has(key);
          return (
            <motion.div
              key={key}
              role={itemRole}
              layout="position"
              layoutDependency={order}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], layout: { type: "spring", stiffness: 500, damping: 42 } }}
              className={clsx(first && "stagger-in", itemClassName)}
              style={first ? ({ "--i": Math.min(i, STAGGER_CAP) } as CSSProperties) : undefined}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
