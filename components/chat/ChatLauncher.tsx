"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChatPanel } from "./ChatPanel";

/** Floating "Ask Duely" bubble that opens a slide-over chat. Hidden on /ask (full-page chat). */
export function ChatLauncher({ period }: { period: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const h = () => setOpen(true);
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-action="ask"]')) setOpen(true);
    };
    window.addEventListener("duely:ask", h);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("duely:ask", h); document.removeEventListener("click", onClick); };
  }, []);

  if (path.startsWith("/ask")) return null;

  return (
    <>
      <AnimatePresence initial={false}>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="fixed bottom-[92px] right-4 z-40 flex min-h-[56px] items-center gap-2 rounded-pill bg-primary pl-4 pr-5 font-bold text-primary-fg shadow-float lg:bottom-6 lg:right-6"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Ask Duely
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
      {open && (
        <div key="chat" className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Ask Duely">
          <motion.button
            type="button" aria-label="Close chat" className="absolute inset-0 bg-scrim" onClick={() => setOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { type: "spring", stiffness: 420, damping: 42 } }}
            transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-bg shadow-float sm:rounded-l-[28px] sm:border-l sm:border-border"
          >
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:rounded-tl-[28px]">
              <p className="font-display text-lg font-extrabold tracking-tight">Ask Duely</p>
              <div className="flex items-center gap-1">
                <Link href="/ask" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Open full page">
                  <Maximize2 className="size-4" aria-hidden="true" />
                </Link>
                <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <ChatPanel period={period} compact className="flex-1" autoFocus />
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
