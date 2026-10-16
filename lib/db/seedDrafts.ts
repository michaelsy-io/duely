import { countDraftsInDb, createDraft, type Draft } from "@/lib/db/drafts";
import { engine, type Period } from "@/lib/ai/context";
import { buildDraftPayload, chooseTone, templateDraft } from "@/lib/ai/agents/draft";
import { reviewDraft } from "@/lib/ai/agents/review";

/** How many sample drafts the empty demo queue gets. */
export const SEED_COUNT = 3;

const g = globalThis as typeof globalThis & { __duelySeeding?: Map<string, Promise<number>> };

/**
 * Demo seed: when a period has no drafts at all in Supabase, write a few waiting drafts so the
 * approval flow can be tried straight away. Uses the same engine payload, engine-filled
 * template and number check as the agents (no AI call, so the page stays fast), and includes
 * one final notice, which stays locked until a CFO or Admin signs.
 *
 * Idempotent: does nothing unless the period has exactly zero drafts. Does nothing when
 * Supabase is not reachable (an in-memory seed would not survive across server instances).
 * Returns the number of drafts created.
 */
export async function ensureDemoDrafts(period: Period): Promise<number> {
  g.__duelySeeding ??= new Map();
  const inflight = g.__duelySeeding.get(period);
  if (inflight) return inflight;
  const run = seed(period).finally(() => g.__duelySeeding?.delete(period));
  g.__duelySeeding.set(period, run);
  return run;
}

async function seed(period: Period): Promise<number> {
  const count = await countDraftsInDb(period);
  if (count !== 0) return 0;

  const res = engine(period);
  const onHold = new Set(res.onHold.map((o) => o.client_code));
  // Same eligibility as the month-end agent run: skip on-hold, disputed and open promises.
  const eligible = [...res.followUp]
    .sort((a, b) => a.rank - b.rank)
    .filter((r) => !onHold.has(r.client_code) && !/disput/i.test(r.reasonText) && !(r.openPromise && r.openPromise.date >= res.asOf))
    .map((row) => ({ row, tone: chooseTone(row, res.escalations.find((e) => e.client_code === row.client_code)?.action) }));

  // One final notice (the two-step approval), the rest the highest-ranked other clients.
  const final = eligible.find((e) => e.tone === "final");
  const others = eligible.filter((e) => e.tone !== "final").slice(0, SEED_COUNT - (final ? 1 : 0));
  const picks = [...(final ? [final] : []), ...others].sort((a, b) => a.row.rank - b.row.rank);

  const made: Draft[] = [];
  for (const { row, tone } of picks) {
    try {
      const payload = buildDraftPayload(period, row);
      const text = templateDraft(payload, tone, "email");
      const review = await reviewDraft({ tone, channel: "email", subject: text.subject, body: text.body }, payload, { llm: false });
      made.push(
        await createDraft({
          period,
          client_code: row.client_code,
          tone,
          channel: "email",
          subject: text.subject,
          body: text.body,
          review: {
            ...review,
            source: "template",
            label: "template",
            model: null,
            note: "Sample draft for the demo, written from the engine template",
            seed: true,
            ruleTone: tone,
            toneOverridden: false,
            reasonText: row.reasonText,
            asOf: res.asOf,
          },
          status: review.verdict === "block" ? "needs_edit" : "pending",
          needs_top_mgmt: tone === "final",
        }),
      );
    } catch (e) {
      console.warn("[seed] draft failed for", row.client_code, (e as Error).message);
    }
  }
  return made.length;
}
