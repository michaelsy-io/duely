"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Briefcase, Loader2, Phone, ShieldCheck, Upload } from "lucide-react";
import { signInAs } from "@/app/actions";
import { MotionProvider } from "@/components/motion/MotionProvider";

const ROLES = [
  { id: "collector", title: "Collecting Agent", body: "Your ranked call list, checks to deposit and one-tap logging.", icon: Phone, tone: "bg-primary text-primary-fg" },
  { id: "supervisor", title: "Supervisor", body: "Approve drafts with every number traced. Recommend holds.", icon: ShieldCheck, tone: "bg-accent text-accent-fg", start: true },
  { id: "cfo", title: "CFO", body: "One page: DSO, aging, cash coming in, bad debt vs allowance.", icon: Briefcase, tone: "bg-good-soft text-good-fg" },
  { id: "admin", title: "Admin", body: "Upload exports, match columns, settle reconciliation questions.", icon: Upload, tone: "bg-warn-soft text-warn-fg" },
];

const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.06 * i } }),
};

/** Animated sign-in: heading and role cards rise in, cards lift on hover, and the picked card shows it is signing in. */
export function LoginPortal() {
  return (
    <MotionProvider>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <motion.div
          className="absolute -right-24 -top-24 size-[420px] rounded-full bg-accent opacity-40 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 24, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-24 size-[360px] rounded-full bg-primary-soft opacity-60 blur-3xl"
          animate={{ x: [0, 28, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="relative">
        <motion.h1 className="h-display text-[44px] sm:text-[72px]" variants={rise} initial="hidden" animate="show" custom={0}>Welcome to Duely</motion.h1>
        <motion.p className="mt-3 max-w-xl text-lg text-fg-muted" variants={rise} initial="hidden" animate="show" custom={1}>Pick a demo role to see the app the way they would.</motion.p>
        <motion.p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-1.5 text-sm font-bold text-accent-fg" variants={rise} initial="hidden" animate="show" custom={2}>Demo accounts, no password needed</motion.p>
        <form action={signInAs} className="mt-10 grid gap-4 sm:grid-cols-2">
          <RoleCards />
        </form>
        <motion.p className="mt-10 text-sm text-fg-subtle" variants={rise} initial="hidden" animate="show" custom={8}>Synthetic data for an ophthalmic distributor. All client names and contacts are fictional.</motion.p>
      </div>
    </MotionProvider>
  );
}

function RoleCards() {
  const { pending } = useFormStatus();
  const [picked, setPicked] = useState<string | null>(null);
  return ROLES.map(({ id, title, body, icon: Icon, tone, start }, i) => {
    const busy = pending && picked === id;
    return (
      <motion.button
        key={id}
        type="submit"
        name="role"
        value={id}
        onClick={() => setPicked(id)}
        disabled={pending}
        aria-busy={busy || undefined}
        variants={rise}
        initial="hidden"
        animate="show"
        custom={3 + i}
        whileHover={pending ? undefined : { y: -3 }}
        whileTap={pending ? undefined : { scale: 0.98 }}
        className={`group card flex items-center gap-4 p-5 text-left transition-[border-color,box-shadow,opacity] hover:border-primary hover:shadow-float sm:p-6 ${start ? "border-primary" : ""} ${pending && !busy ? "opacity-50" : ""}`}
      >
        <motion.span
          className={`grid size-14 shrink-0 place-items-center rounded-full ${tone}`}
          whileHover={{ rotate: -6, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <Icon className="size-6" aria-hidden="true" />
        </motion.span>
        <span className="min-w-0 flex-1">
          {start && (
            <span className="relative mb-1.5 inline-flex overflow-hidden rounded-pill bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-fg">
              Start here for the demo
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 w-8 -skew-x-12 bg-white/30"
                initial={{ x: "-150%" }}
                animate={{ x: "600%" }}
                transition={{ duration: 1.4, delay: 1, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
              />
            </span>
          )}
          <span className="block font-display text-2xl font-extrabold tracking-tight">{title}</span>
          <span className="mt-0.5 block text-sm text-fg-muted">{busy ? `Signing in as ${title}…` : body}</span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-primary-soft-fg transition-transform group-hover:translate-x-1">
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />}
        </span>
      </motion.button>
    );
  });
}
