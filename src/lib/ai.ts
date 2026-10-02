// Cloud-based AI access via Vercel AI Gateway (default) or direct providers.
//
// AI Gateway is a unified endpoint that fronts every major provider
// (Anthropic, OpenAI, Google, Mistral, Meta, etc.) behind a single API.
// You change models by changing a string — "anthropic/claude-opus-4-6" → "openai/gpt-4o".
// It also handles fallbacks, caching, observability, and zero data retention.
//
// Setup: AI_GATEWAY_API_KEY in .env (get from Vercel Dashboard → AI → Gateway).
// Defaults to "auto" model selection — Vercel picks the best Claude available.

import {generateText, streamText, type LanguageModel} from 'ai';
import {createGateway} from '@ai-sdk/gateway';
import {createAnthropic} from '@ai-sdk/anthropic';
import {fromSdkUsage, recordAiUsage} from '@/lib/ai-usage';

// Gateway takes priority when configured; falls back to direct Anthropic for local dev.
const hasGateway = !!process.env.AI_GATEWAY_API_KEY;

const gateway = hasGateway
  ? createGateway({
      apiKey: process.env.AI_GATEWAY_API_KEY!,
      baseURL: process.env.AI_GATEWAY_BASE_URL,
    })
  : null;

const directAnthropic = !hasGateway
  ? createAnthropic({apiKey: process.env.ANTHROPIC_API_KEY ?? ''})
  : null;

// Default model — change with one string. Examples:
//   anthropic/claude-opus-4-6
//   anthropic/claude-sonnet-4-6
//   openai/gpt-4o
//   google/gemini-2.5-pro
//   meta/llama-4-maverick
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';

export function model(name: string = DEFAULT_MODEL): LanguageModel {
  if (gateway) return gateway(name);
  // Direct Anthropic fallback: strip provider prefix
  const modelId = name.replace(/^anthropic\//, '');
  return directAnthropic!(modelId);
}

type CallOpts = {
  model?: string;
  system?: string;
  /** Ledger label, e.g. "bernard", "intelligence.behavioral". Lowercase, [a-z0-9_.:-]. */
  feature?: string;
  /** Member the call is made for (null for system jobs). */
  userId?: string | null;
  traceId?: string | null;
};

// Convenience: one-shot text generation. Every call is recorded in the token ledger.
export async function complete(prompt: string, opts: CallOpts = {}) {
  const name = opts.model ?? DEFAULT_MODEL;
  const started = Date.now();
  try {
    const result = await generateText({
      model: model(name),
      system: opts.system,
      prompt,
    });
    void recordAiUsage({
      feature: opts.feature ?? 'complete',
      model: name,
      userId: opts.userId,
      traceId: opts.traceId,
      latencyMs: Date.now() - started,
      ...fromSdkUsage(result.totalUsage),
    });
    return result.text;
  } catch (e) {
    void recordAiUsage({feature: opts.feature ?? 'complete', model: name, userId: opts.userId, traceId: opts.traceId, latencyMs: Date.now() - started, ok: false});
    throw e;
  }
}

// Convenience: streaming. Pipe to a Next response, RSC stream, or fetch reader.
// Usage is recorded when the stream finishes.
export function stream(prompt: string, opts: CallOpts = {}) {
  const name = opts.model ?? DEFAULT_MODEL;
  const started = Date.now();
  return streamText({
    model: model(name),
    system: opts.system,
    prompt,
    onFinish: ({totalUsage}) => {
      void recordAiUsage({
        feature: opts.feature ?? 'stream',
        model: name,
        userId: opts.userId,
        traceId: opts.traceId,
        latencyMs: Date.now() - started,
        ...fromSdkUsage(totalUsage),
      });
    },
  });
}

// Tool-use / agent-shaped calls. Pass tools defined via `tool({...})` from `ai`.
export {tool, generateObject, streamObject} from 'ai';
