// Shared Nova call for the agents — a direct server call to runNova (no HTTP hop to /api/nova,
// which used NEXT_PUBLIC_SITE_URL and defaulted to localhost in production).
// `instructions` must be a server constant; member/request data goes in `prompt`.

import {runNova} from '@/lib/nova';

export class NovaUnavailableError extends Error {
  constructor(public readonly status: number) {
    super('nova_unavailable');
    this.name = 'NovaUnavailableError';
  }
}

export type AgentCtx = {userId?: string | null};

/** Returns Nova's text, or throws NovaUnavailableError — callers decide how to degrade. */
export async function askNova(
  instructions: string,
  prompt: string,
  opts: {feature: string; image?: string; ctx?: AgentCtx; maxOutputTokens?: number},
): Promise<string> {
  const result = await runNova({
    userId: opts.ctx?.userId ?? null,
    prompt,
    instructions,
    images: opts.image ? [opts.image] : undefined,
    feature: opts.feature,
    maxOutputTokens: opts.maxOutputTokens ?? 3000,
  });
  if (!result.ok) throw new NovaUnavailableError(result.status);
  return result.text;
}

/** Strip a model reply's optional ```json fences. */
export function stripFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
}

/**
 * Make free text safe to embed in a PostgREST `.or()` filter: drop the filter-syntax characters
 * (`,` `(` `)` `"` `\`) and LIKE wildcards so member input can't add or alter filter clauses.
 */
export function orFilterSafe(s: string, max = 80): string {
  return s.replace(/[,()"\\%*_:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
