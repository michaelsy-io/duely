import { format, parseISO } from "date-fns";
import type { Bucket } from "@/lib/engine/types";

const peso0 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

/** ₱1,234,567 */
export function peso(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₱0";
  const s = peso0.format(Math.round(Math.abs(n)));
  return `${n < 0 ? "-" : ""}₱${s}`;
}

/** ₱1.37M / ₱431K — for compact tiles */
export function pesoShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}₱${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (a >= 1_000) return `${sign}₱${Math.round(a / 1_000)}K`;
  return `${sign}₱${Math.round(a)}`;
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDate(iso: string | null | undefined, f = "d MMM yyyy"): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), f);
  } catch {
    return iso;
  }
}

export function bucketForDays(days: number): Bucket {
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export const BUCKETS: Bucket[] = ["Current", "1-30", "31-60", "61-90", "90+"];

/** Token classes for a days-overdue chip. */
export function bucketTone(days: number): string {
  if (days <= 0) return "bg-good-soft text-good-fg";
  if (days <= 30) return "bg-warn-soft text-warn-fg";
  if (days <= 60) return "bg-orange-soft text-orange-fg";
  return "bg-bad-soft text-bad-fg";
}

/** CSS colour (token var) for an aging bucket. */
export function bucketColor(b: Bucket): string {
  return { Current: "var(--good)", "1-30": "var(--accent)", "31-60": "var(--warn)", "61-90": "var(--orange)", "90+": "var(--bad)" }[b];
}
