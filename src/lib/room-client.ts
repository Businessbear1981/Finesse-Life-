'use client';
/** Tiny client helper for room APIs: always returns {ok, status, body} — never throws. */
export async function roomCall<T = Record<string, unknown>>(url: string, init?: RequestInit & {json?: unknown}) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.json !== undefined ? {'Content-Type': 'application/json', ...(init?.headers ?? {})} : init?.headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as T & {message?: string; error?: string};
    return {ok: res.ok, status: res.status, body};
  } catch {
    return {ok: false, status: 0, body: {message: 'The house line is down. Nothing was changed.'} as T & {message?: string; error?: string}};
  }
}
export const fieldCls = 'min-h-11 w-full border border-brass/30 bg-[#0d0608] px-3 font-body text-sm text-cream placeholder:text-cream/35 focus:border-brass focus:outline-none';
export const btnCls = 'min-h-11 border px-4 font-label text-[10px] uppercase tracking-[0.3em] transition disabled:opacity-50';
