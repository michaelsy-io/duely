import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getModel } from "@/lib/ai/provider";
import { aiTools } from "@/lib/mcp/tools";
import { resolvePeriod, shortDate, engine } from "@/lib/ai/context";
import { fallbackAnswer } from "@/lib/ai/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function systemPrompt(period: string, asOf: string) {
  return `You are Duely, a friendly, concise collections assistant for an ophthalmic medical distributor's accounts-receivable team in the Philippines.
Current period: ${period} (as of ${shortDate(asOf, true)}). Treat that date as "today".

Rules:
- Answer ONLY from tool results. Call tools to get data; if the tools don't have it, say so.
- Never invent, estimate, total or recalculate numbers. Quote amounts, dates, invoice and check numbers exactly as the tools return them (pesos like ₱1,234,567; ratios are fractions, so 0.452 = 45.2%).
- Cite where each fact came from with a short chip at the end of the sentence, using the tool result's "source" field, e.g. "(Follow-up list · ${shortDate(asOf)})", "(Client file · ${shortDate(asOf)})", "(KPIs · ${shortDate(asOf)})".
- Priority scores come from the rules engine. You may explain a score using its factors, but never change, re-rank or argue with it.
- You can draft messages with draft_message, but drafts go to the supervisor for approval (final notices also need top management). Never claim a message was sent.
- Use client names, keep answers short, use bullets for lists.`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { messages?: UIMessage[]; period?: string };
  const messages = body.messages ?? [];
  const period = await resolvePeriod(body.period ?? new URL(req.url).searchParams.get("period"));
  const model = getModel("smart");

  if (!model) {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const question = (last?.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join(" ");
    let text: string;
    try {
      text = fallbackAnswer(question, period);
    } catch (e) {
      text = `Sorry — the engine data isn't available yet (${(e as Error).message}).`;
    }
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        const id = "fallback-text";
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: text });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const asOf = engine(period).asOf;
  const result = streamText({
    model,
    system: systemPrompt(period, asOf),
    messages: convertToModelMessages(messages),
    tools: aiTools({ period }),
    stopWhen: stepCountIs(6),
  });
  return result.toUIMessageStreamResponse({
    onError: (e) => {
      console.error("[chat]", e);
      return "Sorry, something went wrong talking to the AI model.";
    },
  });
}
