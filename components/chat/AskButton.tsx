"use client";

import type { ReactNode } from "react";

/** Opens the floating chat (dispatches duely:ask). Renders children inside a button. */
export function AskTrigger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("duely:ask"))}>
      {children}
    </button>
  );
}
