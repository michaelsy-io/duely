import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ModelKind = "fast" | "smart";
export type ProviderName = "anthropic" | "openai";

const DEFAULTS: Record<ProviderName, Record<ModelKind, string>> = {
  anthropic: { smart: "claude-sonnet-5-5", fast: "claude-haiku-5-5" },
  openai: { smart: "gpt-5", fast: "gpt-5-mini" },
};

/** Which provider is configured, or null when no key is present (app runs keyless). */
export function activeProvider(): ProviderName | null {
  const want = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (want === "openai" && hasOpenAI) return "openai";
  if (want === "anthropic" && hasAnthropic) return "anthropic";
  if (hasAnthropic) return "anthropic";
  if (hasOpenAI) return "openai";
  return null;
}

export function modelId(kind: ModelKind, provider = activeProvider()): string | null {
  if (!provider) return null;
  const override = kind === "smart" ? process.env.AI_MODEL_SMART : process.env.AI_MODEL_FAST;
  return override || DEFAULTS[provider][kind];
}

/** AI SDK model for the requested tier, or null when no AI key is configured. */
export function getModel(kind: ModelKind): LanguageModel | null {
  const provider = activeProvider();
  const id = modelId(kind, provider);
  if (!provider || !id) return null;
  if (provider === "anthropic") return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(id);
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(id);
}

export function hasModel(): boolean {
  return activeProvider() !== null;
}
