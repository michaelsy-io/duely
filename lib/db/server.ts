import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Server-side Supabase client. Uses the service-role key when present, otherwise the
 * public anon key (demo RLS policies allow anon read/write). Returns null when env is
 * missing so every helper can fall back to its in-memory store.
 */
export function getDb(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    cached = null;
  }
  return cached;
}

/** Random UUID that works in Node and edge runtimes. */
export function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function warn(where: string, err: unknown): void {
  if (process.env.NODE_ENV !== "test") {
    console.warn(`[db] ${where} failed, using in-memory store:`, (err as { message?: string })?.message ?? err);
  }
}

type MemStores = { drafts: unknown[]; contacts: unknown[]; notifications: unknown[] };
const g = globalThis as typeof globalThis & { __duelyMem?: MemStores };

/** Process-wide in-memory fallback store, shared across Next route bundles. */
export function memStore<K extends keyof MemStores, T>(key: K): T[] {
  g.__duelyMem ??= { drafts: [], contacts: [], notifications: [] };
  return g.__duelyMem[key] as T[];
}
