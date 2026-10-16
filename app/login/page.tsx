import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginPortal } from "@/components/login/LoginPortal";
import { customers } from "@/lib/demo-tables";
import { agentName, COLLECTORS, DEFAULT_PERIOD } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const cust = await customers(DEFAULT_PERIOD).catch(() => []);
  const agents = COLLECTORS.map((c) => ({ id: `collector-${c.replace(/\D/g, "")}`, label: agentName(c), clients: cust.filter((x) => x.collector === c).length }));
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Duely home"><Logo /></Link>
        <Link href="/" className="btn btn-ghost btn-sm">Back to site</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <LoginPortal agents={agents} />
      </main>
    </div>
  );
}
