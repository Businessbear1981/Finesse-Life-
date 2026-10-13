// The Stylist's reading of a photo — the same analysis the web Stylist runs (POST /api/stylist/analyze-photo,
// multipart `file`, bearer-aware, rate limited). The server saves the result as the member's style DNA, which
// the orchestrator's stylist and scout use. Never a canned analysis: a failure says nothing was produced.
import {CONSENT_DECLINED_TEXT, aiUpload} from '../consents';

export type StyleAnalysis = {style_archetype: string; style_labels: string[]; similar_brands: string[]; price_range: string; buying_tendencies: string[]};

const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 8) : []);

export async function analyzePhoto(photo: {uri: string; mimeType?: string | null; fileName?: string | null}): Promise<{ok: true; analysis: StyleAnalysis} | {ok: false; text: string}> {
  const r = await aiUpload<Partial<StyleAnalysis> & {retryAfterS?: number}>('/api/stylist/analyze-photo', photo);
  if (r.ok && typeof r.body.style_archetype === 'string') {
    return {ok: true, analysis: {style_archetype: r.body.style_archetype, style_labels: list(r.body.style_labels), similar_brands: list(r.body.similar_brands),
      price_range: typeof r.body.price_range === 'string' ? r.body.price_range : '', buying_tendencies: list(r.body.buying_tendencies)}};
  }
  if (r.status === 0) return {ok: false, text: 'Offline — no analysis was produced.'};
  if (r.status === 401) return {ok: false, text: 'Sign in to ask Nova. No analysis was produced.'};
  if (r.status === 403 && r.body.error === 'consent_required') return {ok: false, text: CONSENT_DECLINED_TEXT};
  if (r.status === 413) return {ok: false, text: 'That photo is over 5 MB. No analysis was produced.'};
  if (r.status === 415) return {ok: false, text: 'JPEG, PNG, WebP or GIF only. No analysis was produced.'};
  if (r.status === 429) {
    const s = Number(r.body.retryAfterS);
    return {ok: false, text: Number.isFinite(s) && s > 0 ? `Nova needs a moment — try again in ${Math.ceil(s)} s.` : 'Nova needs a moment — try again shortly.'};
  }
  return {ok: false, text: r.body.message ?? 'Nova couldn’t read this photo just now. No analysis was produced.'};
}
