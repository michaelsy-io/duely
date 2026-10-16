"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChatPanel } from "./ChatPanel";

/**
 * Floating "Ask Duely" button (lower right) and its pop-out chat window (3/4 of the screen height).
 * The chat stays mounted while you move around the app, so closing the window only hides it:
 * the conversation lasts until the page is refreshed. Also opens from any [data-action="ask"]
 * element or a `duely:ask` event. Hidden on /ask, which has its own full-page chat.
 */
export function ChatLauncher({ period }: { period: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const onAskPage = path.startsWith("/ask");

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

  useEffect(() => { if (onAskPage) setOpen(false); }, [onAskPage]);

  const shown = open && !onAskPage;

  return (
    <>
      <AnimatePresence>
        {!shown && !onAskPage && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => setOpen(true)}
            className="chat-fab btn btn-primary fixed right-4 z-40 h-14 px-5 shadow-float lg:right-6"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
          >
            <MessageCircle className="size-5" aria-hidden="true" /> Ask Duely
          </motion.button>
        )}
      </AnimatePresence>

      {/* Always mounted so the conversation survives closing the window and moving between pages. */}
      <motion.div
        role="dialog"
        aria-label="Ask Duely"
        aria-hidden={!shown}
        inert={!shown}
        initial={false}
        animate={shown ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" } : { opacity: 0, y: 24, scale: 0.98, pointerEvents: "none" }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        style={{ transformOrigin: "bottom right" }}
        className="chat-window fixed inset-x-0 bottom-0 z-50 flex h-[75dvh] flex-col overflow-hidden rounded-t-[28px] border border-border bg-bg shadow-float sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[min(440px,calc(100vw-2rem))] sm:rounded-[28px] lg:right-6 lg:bottom-6"
      >
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <p className="font-display text-lg font-extrabold tracking-tight">Ask Duely</p>
          <div className="flex items-center gap-1">
            <Link href="/ask" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Open full page">
              <Maximize2 className="size-4" aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Close (your chat is kept)">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ChatPanel period={period} compact className="min-h-0 flex-1" autoFocus={shown} />
      </motion.div>
    </>
  );
}
