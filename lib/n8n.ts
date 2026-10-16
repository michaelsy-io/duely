import type { Draft } from "@/lib/db/drafts";
import { clientName } from "@/lib/clients";

export type Delivery = "sent" | "skipped" | "failed";

/**
 * After a supervisor approves a letter, hand it to n8n (workflow n8n/send-approved-letter.json),
 * which emails a TEST copy to the team's own inbox. It never emails the client.
 * Skipped when N8N_LETTER_WEBHOOK_URL is not set, so the app works without n8n.
 */
export async function sendApprovedLetter(draft: Draft): Promise<Delivery> {
  const url = process.env.N8N_LETTER_WEBHOOK_URL;
  if (!url) return "skipped";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hook-secret": process.env.HOOK_SECRET ?? "" },
      body: JSON.stringify({
        test: true,
        id: draft.id,
        period: draft.period,
        client_code: draft.client_code,
        client_name: clientName(draft.client_code),
        tone: draft.tone,
        channel: draft.channel,
        subject: draft.subject,
        body: draft.body,
        approved_by: draft.approved_by,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return r.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
