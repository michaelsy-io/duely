import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Briefcase, Phone, ShieldCheck, Upload } from "lucide-react";
import { signInAs } from "@/app/actions";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Sign in" };

const ROLES = [
  { id: "collector", title: "Collecting Agent", body: "Your ranked call list, checks to deposit and one-tap logging.", icon: Phone, tone: "bg-primary text-primary-fg" },
  { id: "supervisor", title: "Supervisor", body: "Approve drafts with every number traced. Recommend holds.", icon: ShieldCheck, tone: "bg-accent text-accent-fg" },
  { id: "cfo", title: "CFO", body: "One page: DSO, aging, cash coming in, bad debt vs allowance.", icon: Briefcase, tone: "bg-good-soft text-good-fg" },
  { id: "admin", title: "Admin", body: "Upload exports, match columns, settle reconciliation questions.", icon: Upload, tone: "bg-warn-soft text-warn-fg" },
];

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Duely home"><Logo /></Link>
        <Link href="/" className="btn btn-ghost btn-sm">Back to site</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <h1 className="h-display text-[44px] sm:text-[72px]">Welcome to Duely</h1>
        <p className="mt-3 max-w-xl text-lg text-fg-muted">Pick a demo role to see the app the way they would.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-1.5 text-sm font-bold text-accent-fg">Demo accounts, no password needed</p>

        <form action={signInAs} className="mt-10 grid gap-4 sm:grid-cols-2">
          {ROLES.map(({ id, title, body, icon: Icon, tone }) => (
            <button
              key={id}
              type="submit"
              name="role"
              value={id}
              className="group card flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary sm:p-6"
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="size-6" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-extrabold tracking-tight">{title}</span>
                <span className="mt-0.5 block text-sm text-fg-muted">{body}</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-primary-soft-fg transition-transform group-hover:translate-x-1"><ArrowRight className="size-5" aria-hidden="true" /></span>
            </button>
          ))}
        </form>
        <p className="mt-10 text-sm text-fg-subtle">Synthetic data for an ophthalmic distributor. All client names and contacts are fictional.</p>
      </main>
    </div>
  );
}
