import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginPortal } from "@/components/login/LoginPortal";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Duely home"><Logo /></Link>
        <Link href="/" className="btn btn-ghost btn-sm">Back to site</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <LoginPortal />
      </main>
    </div>
  );
}
