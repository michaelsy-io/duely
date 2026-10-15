/**
 * RAG helpers: embeddings via the Supabase `embed` edge function (gte-small, 384d),
 * vector search via the `match_kb` RPC, and a keyword fallback over an in-memory
 * corpus so search never throws. Server-only.
 */
import { getDb } from "@/lib/db/server";
import { buildCorpus, buildFullCorpus, type KbChunk, type Period } from "./corpus";

export { buildCorpus, buildFullCorpus };
export type { KbChunk, Period };

export interface KnowledgeHit {
  source: string;
  ref: string;
  content: string;
  similarity: number;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  if (!texts.length) return [];
  const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify({ input: texts }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { embeddings?: number[][] };
  if (!json.embeddings || json.embeddings.length !== texts.length) throw new Error("embed: bad response");
  return json.embeddings;
}

export async function searchKnowledge(query: string, k = 6, period?: string): Promise<KnowledgeHit[]> {
  const db = getDb();
  if (db && query.trim()) {
    try {
      const [vec] = await embed([query]);
      const { data, error } = await db.rpc("match_kb", {
        query_embedding: vec as unknown as string,
        match_count: k,
        filter_period: period ?? null,
      });
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        return data.map((r: KnowledgeHit) => ({
          source: r.source,
          ref: r.ref,
          content: r.content,
          similarity: Number(r.similarity),
        }));
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "test") console.warn("[rag] vector search failed, using keyword fallback:", (e as Error)?.message ?? e);
    }
  }
  return keywordSearch(query, k, period);
}

// ---------- keyword fallback ----------

let memCorpus: KbChunk[] | null = null;
function corpus(): KbChunk[] {
  if (!memCorpus) {
    try {
      memCorpus = buildFullCorpus();
    } catch {
      memCorpus = [];
    }
  }
  return memCorpus;
}

const STOP = new Set("a an the of to and or for in on by is are was with from what who which how did does do has have at as be it this that any".split(" "));

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9₱.-]+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function keywordSearch(query: string, k = 6, period?: string): KnowledgeHit[] {
  const q = Array.from(new Set(tokens(query)));
  if (!q.length) return [];
  const docs = corpus().filter((c) => !period || c.period === period || c.period === null);
  const df = new Map<string, number>();
  const docToks = docs.map((d) => {
    const set = new Set(tokens(d.content + " " + d.ref));
    for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
    return set;
  });
  const N = docs.length || 1;
  const scored = docs.map((d, i) => {
    let s = 0;
    for (const t of q) {
      let hit = docToks[i].has(t);
      if (!hit && t.length > 3) for (const dt of docToks[i]) if (dt.startsWith(t)) { hit = true; break; }
      if (hit) s += Math.log(1 + N / (1 + (df.get(t) ?? 0)));
    }
    return { d, s };
  });
  const max = Math.max(1e-9, ...scored.map((x) => x.s));
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ d, s }) => ({ source: d.source, ref: d.ref, content: d.content, similarity: Number((s / max).toFixed(3)) }));
}
