import { getDb, memStore, uuid, warn } from "./server";

export type DraftTone = "friendly" | "firm" | "final";
export type DraftStatus = "pending" | "approved" | "rejected" | "needs_edit" | "held";

export interface Draft {
  id: string;
  period: string | null;
  client_code: string;
  tone: DraftTone;
  channel: string | null;
  subject: string | null;
  body: string | null;
  review: unknown | null;
  status: DraftStatus;
  needs_top_mgmt: boolean;
  approved_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export type NewDraft = Omit<Draft, "id" | "created_at" | "status" | "approved_by" | "decided_at" | "needs_top_mgmt"> & {
  status?: DraftStatus;
  needs_top_mgmt?: boolean;
  approved_by?: string | null;
  decided_at?: string | null;
};

const mem = memStore<"drafts", Draft>("drafts");

function upsertMem(d: Draft): Draft {
  const i = mem.findIndex((x) => x.id === d.id);
  if (i >= 0) mem[i] = d;
  else mem.unshift(d);
  return d;
}

export async function listDrafts(period?: string): Promise<Draft[]> {
  const db = getDb();
  if (db) {
    try {
      let q = db.from("drafts").select("*").order("created_at", { ascending: false });
      if (period) q = q.eq("period", period);
      const { data, error } = await q;
      if (error) throw error;
      // merge any rows only held in memory (written while the DB was unreachable)
      const ids = new Set((data ?? []).map((d) => d.id));
      const extra = mem.filter((d) => !ids.has(d.id) && (!period || d.period === period));
      return [...extra, ...((data ?? []) as Draft[])];
    } catch (e) {
      warn("listDrafts", e);
    }
  }
  return mem.filter((d) => !period || d.period === period);
}

/**
 * Number of drafts for a period in Supabase (any status), or null when the database is not
 * reachable. Used to decide whether to seed demo drafts: only ever when this is exactly 0.
 */
export async function countDraftsInDb(period: string): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { count, error } = await db.from("drafts").select("id", { count: "exact", head: true }).eq("period", period);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    warn("countDraftsInDb", e);
    return null;
  }
}

export async function getDraft(id: string): Promise<Draft | null> {
  const local = mem.find((d) => d.id === id);
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("drafts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (data) return data as Draft;
    } catch (e) {
      warn("getDraft", e);
    }
  }
  return local ?? null;
}

export async function createDraft(d: NewDraft): Promise<Draft> {
  const row: Draft = {
    id: uuid(),
    created_at: new Date().toISOString(),
    period: d.period ?? null,
    client_code: d.client_code,
    tone: d.tone,
    channel: d.channel ?? null,
    subject: d.subject ?? null,
    body: d.body ?? null,
    review: d.review ?? null,
    status: d.status ?? "pending",
    needs_top_mgmt: d.needs_top_mgmt ?? d.tone === "final",
    approved_by: d.approved_by ?? null,
    decided_at: d.decided_at ?? null,
  };
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("drafts").insert(row).select("*").single();
      if (error) throw error;
      return data as Draft;
    } catch (e) {
      warn("createDraft", e);
    }
  }
  return upsertMem(row);
}

export async function updateDraft(id: string, patch: Partial<Omit<Draft, "id" | "created_at">>): Promise<Draft | null> {
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("drafts").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      if (data) return data as Draft;
    } catch (e) {
      warn("updateDraft", e);
    }
  }
  const cur = mem.find((d) => d.id === id);
  if (!cur) return null;
  return upsertMem({ ...cur, ...patch });
}

export async function setDraftStatus(id: string, status: DraftStatus, by?: string): Promise<Draft | null> {
  const decided = status === "pending" ? null : new Date().toISOString();
  return updateDraft(id, {
    status,
    decided_at: decided,
    ...(by !== undefined ? { approved_by: by } : {}),
  });
}
