"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import clsx from "clsx";
import { ArrowUp, RotateCcw, Sparkles, Square, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { LogoMark } from "@/components/Logo";
import { Markdownish } from "./Markdownish";

export const SUGGESTIONS = [
  "Who should I call first today?",
  "How much is coming in from checks this week?",
  "Are we covered for bad debt?",
];

function toolLabel(type: string, name?: string) {
  const n = (name ?? type.replace(/^tool-/, "")).replace(/[_-]+/g, " ");
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function MessageBody({ m }: { m: UIMessage }) {
  return (
    <>
      {m.parts.map((p, i) => {
        if (p.type === "text") return <Markdownish key={i} text={p.text} />;
        if (p.type === "dynamic-tool" || p.type.startsWith("tool-")) {
          const part = p as { type: string; toolName?: string; state?: string };
          const done = part.state === "output-available";
          const failed = part.state === "output-error";
          return (
            <span key={i} className={clsx("my-1 mr-1 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold", failed ? "bg-bad-soft text-bad-fg" : "bg-surface-3 text-primary-soft-fg")}>
              <Wrench className="size-3" aria-hidden="true" />
              {done ? "Checked" : failed ? "Could not check" : "Checking"} · {toolLabel(part.type, part.toolName)}
            </span>
          );
        }
        if (p.type === "source-url") {
          const s = p as { url: string; title?: string };
          return <a key={i} href={s.url} className="mr-1 text-xs font-semibold text-primary underline">{s.title ?? "Source"}</a>;
        }
        return null;
      })}
    </>
  );
}

const BUBBLE_IN = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } };

/** Three dots that bob in turn while Duely is working on an answer. */
function TypingDots() {
  return (
    <span className="flex h-4 items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-fg-muted"
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export function ChatPanel({ period, compact = false, className, autoFocus }: { period: string; compact?: boolean; className?: string; autoFocus?: boolean }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { period } }), [period]);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ transport });
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, error]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (error) clearError();
    setInput("");
    void sendMessage({ text: t });
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5" aria-live="polite">
        {messages.length === 0 && (
          <div className={clsx("flex flex-col items-center text-center", compact ? "pt-6" : "pt-12")}>
            <LogoMark size={52} />
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Ask Duely</h2>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">Questions about your clients, checks and cash. Every number comes from the rules engine.</p>
            <div className="mt-6 flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="flex min-h-[48px] items-center gap-2 rounded-pill border border-border bg-surface px-4 text-left text-sm font-semibold hover:bg-surface-2">
                  <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <motion.div key={m.id} {...BUBBLE_IN} className={clsx("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role !== "user" && <LogoMark size={28} className="mt-1 shrink-0" />}
              <div className={clsx("max-w-[85%] rounded-[20px] px-4 py-2.5 text-[14.5px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md border border-border bg-surface text-fg")}>
                <MessageBody m={m} />
              </div>
            </motion.div>
          ))}
          <AnimatePresence initial={false}>
            {status === "submitted" && (
              <motion.div key="typing" className="flex gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                <LogoMark size={28} className="mt-1 shrink-0" />
                <div role="status" className="rounded-[20px] rounded-bl-md border border-border bg-surface px-4 py-3.5" aria-label="Duely is thinking">
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {error && (
            <motion.div {...BUBBLE_IN} className="flex gap-2">
              <LogoMark size={28} className="mt-1 shrink-0" />
              <div className="max-w-[85%] rounded-[20px] rounded-bl-md border border-warn bg-warn-soft px-4 py-3 text-sm text-fg">
                <p className="font-bold">Duely can&apos;t answer right now.</p>
                <p className="mt-1 text-fg-muted">The assistant is offline or not set up yet. Your follow-up list, checks and CFO view still work, since every number comes from the rules engine.</p>
                <button type="button" onClick={() => { clearError(); const last = [...messages].reverse().find((x) => x.role === "user"); const txt = last?.parts.find((p) => p.type === "text"); if (last && txt && txt.type === "text") { setMessages(messages.filter((x) => x.id !== last.id)); send(txt.text); } }} className="btn btn-sm btn-secondary mt-2">
                  <RotateCcw className="size-3.5" aria-hidden="true" /> Try again
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {messages.length > 0 && !busy && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 sm:px-5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="shrink-0 rounded-pill bg-surface-3 px-3 py-1.5 text-xs font-semibold text-primary-soft-fg hover:brightness-95">
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="border-t border-border bg-surface p-3">
        <div className="flex items-end gap-2 rounded-[24px] border border-border bg-bg p-1.5 pl-4 focus-within:border-primary">
          <label htmlFor="duely-chat-input" className="sr-only">Message Duely</label>
          <textarea
            id="duely-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about a client, checks, cash…"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] text-fg outline-none placeholder:text-fg-subtle"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-fg" aria-label="Stop">
              <Square className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-fg disabled:opacity-40" aria-label="Send">
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-2 text-[11px] text-fg-subtle">Answers are drafted by AI from engine numbers. Nothing is sent to clients without approval.</p>
      </form>
    </div>
  );
}
