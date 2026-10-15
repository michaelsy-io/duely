import { generateObject } from "ai";
import { z } from "zod";
import type { DraftTone } from "@/lib/db/drafts";
import { getModel } from "@/lib/ai/provider";
import { verifyNumbers } from "@/lib/ai/verify";

export type Verdict = "pass" | "fix" | "block";

export interface ReviewResult {
  verdict: Verdict;
  issues: string[];
  unknownNumbers: string[];
  checks: { numbers: boolean; legal: boolean; length: boolean };
  critique?: string;
  source?: "ai" | "template";
  note?: string;
}

export const SMS_MAX = 320;
export const EMAIL_MAX = 2500;
const LEGAL_RE = /\b(legal action|lawyer|attorney|court|su(e|ing)|lawsuit|demand letter|collection agency|blacklist(ed)?|litigation|criminal|estafa|B\.?P\.? ?22)\b/i;

/** Deterministic review, plus an optional LLM tone critique that can only downgrade pass → fix. */
export async function reviewDraft(
  d: { tone: DraftTone; channel: string; subject: string; body: string },
  payload: unknown,
  opts: { llm?: boolean } = {},
): Promise<ReviewResult> {
  const text = `${d.subject}\n${d.body}`;
  const issues: string[] = [];
  let verdict: Verdict = "pass";

  const v = verifyNumbers(text, payload);
  if (!v.ok) {
    verdict = "block";
    issues.push(`Values not found in engine data: ${v.unknown.join(", ")}`);
  }

  const legalHit = d.tone !== "final" ? text.match(LEGAL_RE) : null;
  if (legalHit) {
    verdict = "block";
    issues.push(`Legal/threat wording ("${legalHit[0]}") is only allowed in a final notice`);
  }

  const max = d.channel === "sms" ? SMS_MAX : EMAIL_MAX;
  const len = d.channel === "sms" ? d.body.length : text.length;
  const lengthOk = len <= max;
  if (!lengthOk) {
    if (verdict === "pass") verdict = "fix";
    issues.push(`Too long for ${d.channel}: ${len} characters (max ${max})`);
  }
  if (!d.body.trim()) {
    verdict = "block";
    issues.push("Empty body");
  }

  const result: ReviewResult = {
    verdict,
    issues,
    unknownNumbers: v.unknown,
    checks: { numbers: v.ok, legal: !legalHit, length: lengthOk },
  };

  const model = opts.llm ? getModel("fast") : null;
  if (model && verdict === "pass") {
    try {
      const { object } = await generateObject({
        model,
        schema: z.object({ ok: z.boolean(), critique: z.string() }),
        system:
          "You review collection messages for tone. Friendly = warm thank-you + gentle reminder. Firm = clear facts, asks for a payment date, no threats. Final = formal, states consequences. Reply ok=false only for a real problem (wrong tone, rude, confusing). critique: one short sentence.",
        prompt: `Intended tone: ${d.tone}\nChannel: ${d.channel}\nSubject: ${d.subject}\n\n${d.body}`,
      });
      result.critique = object.critique;
      if (!object.ok) {
        result.verdict = "fix";
        result.issues.push(`Tone review: ${object.critique}`);
      }
    } catch {
      /* critique is optional */
    }
  }
  return result;
}
