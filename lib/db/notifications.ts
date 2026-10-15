import { getDb, memStore, uuid, warn } from "./server";

export interface Notification {
  id: string;
  role: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type NewNotification = { role: string; title: string; body?: string | null; link?: string | null };

const mem = memStore<"notifications", Notification>("notifications");

export async function listNotifications(role: string): Promise<Notification[]> {
  const local = mem.filter((n) => n.role === role);
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db
        .from("notifications")
        .select("*")
        .eq("role", role)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const ids = new Set((data ?? []).map((d) => d.id));
      return [...local.filter((n) => !ids.has(n.id)), ...((data ?? []) as Notification[])];
    } catch (e) {
      warn("listNotifications", e);
    }
  }
  return local;
}

export async function createNotification(n: NewNotification): Promise<Notification> {
  const row: Notification = {
    id: uuid(),
    created_at: new Date().toISOString(),
    role: n.role,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    read: false,
  };
  const db = getDb();
  if (db) {
    try {
      const { data, error } = await db.from("notifications").insert(row).select("*").single();
      if (error) throw error;
      return data as Notification;
    } catch (e) {
      warn("createNotification", e);
    }
  }
  mem.unshift(row);
  return row;
}

export async function markRead(id: string): Promise<void> {
  const local = mem.find((n) => n.id === id);
  if (local) local.read = true;
  const db = getDb();
  if (db && !local) {
    try {
      const { error } = await db.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    } catch (e) {
      warn("markRead", e);
    }
  }
}
