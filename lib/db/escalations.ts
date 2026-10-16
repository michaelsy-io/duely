import { getDb, warn } from "./server";

/** What a person decided about an engine-recommended escalation. "open" = reopened / undecided. */
export type EscalationDecisionKind = "approved" | "dismissed" | "open";

export interface EscalationDecision {
  client_code: string;
  action: string | null;
  decision: EscalationDecisionKind;
  decided_by: string | null;
  decided_role: string | null;
  decided_at: string;
}

/** Where decisions are kept: the shared Supabase table, or (fallback) a cookie in this browser only. */
export type DecisionStore = "db" | "cookie";

export const ESC_COOKIE_PREFIX = "duely_esc_";
export const DECIDER_ROLES = ["supervisor", "cfo", "admin"] as const;

export function canDecideEscalations(role: string): boolean {
  return (DECIDER_ROLES as readonly string[]).includes(role);
}

export function isDecisionKind(v: unknown): v is EscalationDecisionKind {
  return v === "approved" || v === "dismissed" || v === "open";
}

/** Decisions for a period from Supabase, or null when the table / database is not reachable. */
export async function listEscalationDecisions(period: string): Promise<EscalationDecision[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db.from("escalation_decisions").select("client_code, action, decision, decided_by, decided_role, decided_at").eq("period", period);
    if (error) throw error;
    return (data ?? []) as EscalationDecision[];
  } catch (e) {
    warn("listEscalationDecisions", e);
    return null;
  }
}

/** Upsert one decision. Returns null when Supabase (or the escalation_decisions table) is not available. */
export async function saveEscalationDecision(period: string, d: EscalationDecision): Promise<EscalationDecision | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("escalation_decisions")
      .upsert({ period, ...d }, { onConflict: "period,client_code" })
      .select("client_code, action, decision, decided_by, decided_role, decided_at")
      .single();
    if (error) throw error;
    return data as EscalationDecision;
  } catch (e) {
    warn("saveEscalationDecision", e);
    return null;
  }
}

/** Parse the fallback cookie value: { [client_code]: decision }. */
export function parseDecisionCookie(raw: string | undefined): Record<string, EscalationDecision> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, EscalationDecision>;
    const out: Record<string, EscalationDecision> = {};
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (/^[A-Z0-9-]{1,16}$/.test(k) && v && isDecisionKind(v.decision)) out[k] = { ...v, client_code: k };
    }
    return out;
  } catch {
    return {};
  }
}
