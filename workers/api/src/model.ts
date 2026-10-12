import type { ModelProvider } from './engines/types';

/** Offline adapter: returns nothing, so every engine falls back to its deterministic path. */
export const nullModel: ModelProvider = { id: 'none', complete: async () => '' };

/** Scripted adapter for tests. */
export function fakeModel(reply: string | ((prompt: string) => string)): ModelProvider {
  return { id: 'fake', complete: async (p) => (typeof reply === 'function' ? reply(p) : reply) };
}

/** Vercel AI Gateway (OpenAI-compatible chat completions). Used only when a key is configured. */
export function gatewayModel(apiKey: string, model = 'anthropic/claude-haiku-4.5'): ModelProvider {
  return {
    id: model,
    async complete(prompt) {
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
      });
      if (!r.ok) throw new Error(`model ${r.status}`);
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      return j.choices?.[0]?.message?.content ?? '';
    },
  };
}

export function parseJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
