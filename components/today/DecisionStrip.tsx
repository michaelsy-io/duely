import Link from "next/link";
import { ArrowRight, ClipboardCheck, LineChart } from "lucide-react";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Supervisor/Admin: what is waiting on a decision. CFO: a pointer to their own view. */
export function DecisionStrip({ role, drafts, escalations }: { role: "supervisor" | "admin" | "cfo"; drafts: number | null; escalations: number }) {
  const cls = "flex min-h-[52px] items-center gap-3 rounded-card bg-primary-soft px-4 py-2.5 text-sm text-primary-soft-fg transition-[filter] hover:brightness-[.97] sm:px-5";
  if (role === "cfo") {
    return (
      <Link href="/cfo" className={cls}>
        <LineChart className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1"><b>Cash, risk and sign-offs</b> are on the CFO view.</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-bold">Open<ArrowRight className="size-4" aria-hidden="true" /></span>
      </Link>
    );
  }
  const parts = [
    drafts !== null ? plural(drafts, "draft waiting", "drafts waiting") : null,
    plural(escalations, "escalation to decide", "escalations to decide"),
  ].filter(Boolean);
  return (
    <Link href="/approvals" className={cls}>
      <ClipboardCheck className="size-5 shrink-0" aria-hidden="true" />
      <span className="num min-w-0 flex-1 font-bold">{parts.join(" · ")}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-bold">Approvals<ArrowRight className="size-4" aria-hidden="true" /></span>
    </Link>
  );
}
