/**
 * Seed the RAG knowledge base (kb_chunks) from the demo data.
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/seed-kb.ts
 * (or put them in .env.local; this script loads it). Clears kb_chunks first.
 * Pass --dry to just print counts, --sql <file> to write INSERT statements without embeddings.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildFullCorpus } from "../lib/rag/corpus";
import { embed, searchKnowledge } from "../lib/rag/index";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const chunks = buildFullCorpus();
  const bySource: Record<string, number> = {};
  for (const c of chunks) bySource[`${c.period ?? "all"}:${c.source}`] = (bySource[`${c.period ?? "all"}:${c.source}`] ?? 0) + 1;
  console.log(`corpus: ${chunks.length} chunks`, bySource);

  const sqlIdx = process.argv.indexOf("--sql");
  if (sqlIdx > 0) {
    const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
    const rows = chunks.map((c) => `(${q(c.source)},${q(c.ref)},${q(c.period)},${q(c.content)})`);
    fs.writeFileSync(
      process.argv[sqlIdx + 1],
      `insert into public.kb_chunks (source, ref, period, content) values\n${rows.join(",\n")};\n`,
    );
    console.log("wrote", process.argv[sqlIdx + 1]);
    return;
  }
  if (process.argv.includes("--dry")) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const del = await db.from("kb_chunks").delete().gte("id", 0);
  if (del.error) throw del.error;

  const B = 8; // gte-small on the edge runtime hits WORKER_RESOURCE_LIMIT at ~32 inputs per call
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += B) {
    const batch = chunks.slice(i, i + B);
    let vecs: number[][] | null = null;
    for (let attempt = 1; attempt <= 3 && !vecs; attempt++) {
      try {
        vecs = await embed(batch.map((c) => c.content));
      } catch (e) {
        console.warn(`embed batch ${i / B} attempt ${attempt} failed:`, (e as Error).message);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (!vecs) throw new Error(`embedding failed for batch starting at ${i}`);
    const { error } = await db
      .from("kb_chunks")
      .insert(batch.map((c, j) => ({ ...c, embedding: JSON.stringify(vecs![j]) })));
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\rinserted ${inserted}/${chunks.length}`);
  }
  console.log("\ndone.");

  const hits = await searchKnowledge("Lumen Eye promise", 5);
  console.log("sample search: Lumen Eye promise");
  for (const h of hits) console.log(`  ${h.similarity.toFixed(3)} [${h.source}] ${h.content.slice(0, 120)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
