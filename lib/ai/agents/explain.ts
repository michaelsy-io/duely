import { generateText } from "ai";
import type { FollowUpRow } from "@/lib/engine/types";
import { getModel } from "@/lib/ai/provider";
import { verifyNumbers } from "@/lib/ai/verify";
import { nameOf, peso } from "@/lib/ai/context";

export interface Explanation {
  text: string;
  source: "ai" | "template";
}

/** Deterministic explanation straight from the engine's reason text. */
export function templateExplain(row: FollowUpRow): string {
  const top = [...row.factors].sort((a, b) => b.points - a.points)[0];
  return `${nameOf(row.client_code)} is #${row.rank} on the list (score ${row.score}) because: ${row.reasonText}.${
    top ? ` The biggest factor is "${top.label}" (+${top.points}).` : ""
  } Overdue: ${peso(row.overdue)}.`;
}

/** 1–2 sentence plain-English explanation of why a client is on the follow-up list. Never changes the score. */
export async function explainRow(row: FollowUpRow): Promise<Explanation> {
  const model = getModel("fast");
  if (!model) return { text: templateExplain(row), source: "template" };
  const payload = {
    client: nameOf(row.client_code),
    rank: row.rank,
    score: row.score,
    overdue: row.overdue,
    oldestDays: row.oldestDays,
    reasonText: row.reasonText,
    factors: row.factors,
    openPromise: row.openPromise,
    pdcCover: row.pdcCover,
  };
  try {
    const { text } = await generateText({
      model,
      system:
        "Explain in 1–2 short plain-English sentences why this client is on today's collections follow-up list, for a collector. Use only the facts given; do not recalculate or change the score; format pesos like ₱1,234,567.",
      prompt: JSON.stringify(payload),
    });
    const t = text.trim();
    if (t && verifyNumbers(t, payload).ok) return { text: t, source: "ai" };
  } catch (e) {
    console.warn("[explain] AI failed", e);
  }
  return { text: templateExplain(row), source: "template" };
}
