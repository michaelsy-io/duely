import { getDb, memStore, uuid, warn } from "./server";

export interface ContactLog {
  id: string;
  period: string | null;
  client_code: string;
  channel: string | null;
  outcome: string | null;
  promise_amount: number | null;
  promise_date: string | null;
  note: string | null;
  logged_by: string | null;
  created_at: string;
}

export type NewContactLog = Partial<Omit<ContactLog, "id" | "created_at" | "client_code">> & { client_code: string };

const mem = memStore<"contacts", ContactLog>("contacts");

export async function logContact(entry: NewContactLog): Promise<ContactLog> {
  const row: ContactLog = {
    id: uuid(),
    created_at: new Date().toISOString(),
    period: entry.period ?? null,
    client_code: entry.client_code,
    channel: entry.channel ?? null,
    outcome: entry.outcome ?? null,
    promise_amount: entry.promise_amount ?? null,
    promise_date: entry.promise_date || null,
    note: entry.note ?? null,
    logged_by: entry.logged_by ?? null,
  };
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("contact_logs").insert(row).select("*").single();
      if (error) throw error;
      return normalize(data);
    } catch (e) {
      warn("logContact", e);
    }
  }
  mem.unshift(row);
  return row;
}

export async function listContacts(client_code: string, period?: string): Promise<ContactLog[]> {
  const local = mem.filter((c) => c.client_code === client_code && (!period || c.period === period));
  const db = getDb();
  if (db) {
    try {
      let q = db.from("contact_logs").select("*").eq("client_code", client_code).order("created_at", { ascending: false });
      if (period) q = q.eq("period", period);
      const { data, error } = await q;
      if (error) throw error;
      const ids = new Set((data ?? []).map((d) => d.id));
      return [...local.filter((c) => !ids.has(c.id)), ...(data ?? []).map(normalize)];
    } catch (e) {
      warn("listContacts", e);
    }
  }
  return local;
}

function normalize(r: Record<string, unknown>): ContactLog {
  return {
    ...(r as unknown as ContactLog),
    promise_amount: r.promise_amount == null ? null : Number(r.promise_amount),
  };
}
