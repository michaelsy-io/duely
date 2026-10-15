import { createDraft, listDrafts, type Draft, type DraftTone } from "@/lib/db/drafts";
import { engine, type Period } from "@/lib/ai/context";
import { hasModel } from "@/lib/ai/provider";
import { buildDraftPayload, chooseTone, writeDraft, type Channel } from "./draft";
import { reviewDraft } from "./review";

export class DraftError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Draft → review → store one message for a client. Tone comes from the code rule unless explicitly overridden. */
export async function draftForClient(
  period: Period,
  client_code: string,
  opts: { tone?: DraftTone; channel?: Channel; llmReview?: boolean } = {},
): Promise<Draft> {
  const res = engine(period);
  const row = res.followUp.find((r) => r.client_code === client_code);
  if (!row) throw new DraftError(`${client_code} is not on the ${period} follow-up list`, 404);
  const esc = res.escalations.find((e) => e.client_code === client_code);
  const ruleTone = chooseTone(row, esc?.action);
  const tone = opts.tone ?? ruleTone;
  const channel = opts.channel ?? "email";
  const payload = buildDraftPayload(period, row);
  const text = await writeDraft(payload, tone, channel);
  const review = await reviewDraft({ tone, channel, subject: text.subject, body: text.body }, payload, {
    llm: opts.llmReview ?? hasModel(),
  });
  return createDraft({
    period,
    client_code,
    tone,
    channel,
    subject: text.subject,
    body: text.body,
    review: {
      ...review,
      source: text.source,
      label: text.source === "template" ? "template" : "ai",
      model: text.model ?? null,
      note: text.note ?? null,
      ruleTone,
      toneOverridden: tone !== ruleTone,
      reasonText: row.reasonText,
      asOf: res.asOf,
    },
    status: review.verdict === "block" ? "needs_edit" : "pending",
    needs_top_mgmt: tone === "final",
  });
}

export interface AgentRunResult {
  period: Period;
  asOf: string;
  created: { id: string; client_code: string; tone: DraftTone; verdict: string; source: string }[];
  skipped: { client_code: string; reason: string }[];
  ai: boolean;
}

/** Month-end run: draft for the top-N follow-up rows, skipping on-hold/disputed, open promises and clients already drafted. */
export async function runMonthAgents(period: Period, limit = 8): Promise<AgentRunResult> {
  const res = engine(period);
  const onHold = new Map(res.onHold.map((o) => [o.client_code, o.reason]));
  const existing = new Set(
    (await listDrafts(period)).filter((d) => d.status === "pending" || d.status === "needs_edit").map((d) => d.client_code),
  );
  const out: AgentRunResult = { period, asOf: res.asOf, created: [], skipped: [], ai: hasModel() };
  const rows = [...res.followUp].sort((a, b) => a.rank - b.rank);
  for (const row of rows) {
    if (out.created.length >= limit) break;
    const code = row.client_code;
    if (onHold.has(code)) {
      out.skipped.push({ client_code: code, reason: `On hold: ${onHold.get(code)}` });
      continue;
    }
    if (/disput/i.test(row.reasonText)) {
      out.skipped.push({ client_code: code, reason: "Disputed" });
      continue;
    }
    if (row.openPromise && row.openPromise.date >= res.asOf) {
      out.skipped.push({ client_code: code, reason: `Open promise to pay until ${row.openPromise.date}` });
      continue;
    }
    if (existing.has(code)) {
      out.skipped.push({ client_code: code, reason: "Draft already awaiting approval" });
      continue;
    }
    try {
      const d = await draftForClient(period, code);
      const rv = d.review as { verdict?: string; source?: string } | null;
      out.created.push({ id: d.id, client_code: code, tone: d.tone, verdict: rv?.verdict ?? "?", source: rv?.source ?? "?" });
    } catch (e) {
      out.skipped.push({ client_code: code, reason: `Error: ${(e as Error).message}` });
    }
  }
  return out;
}
