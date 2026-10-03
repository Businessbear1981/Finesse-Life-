# 0003 — AI token usage ledger

> **Status:** PROPOSED
> **Date:** 2026-10-02
> **Decision:** Record every model call's token counts and an estimated cost in an append-only Supabase table, instead of relying only on the provider/AI Gateway dashboards.

## Context

Nova, Stylist, Camera, Bernard and the intelligence jobs all call Claude. Nobody could see which feature or member drove spend, and `/api/bernard` relays arbitrary prompts for any signed-in member. The founder also wants usage visible in an Obsidian vault.

## Options considered

- **Own ledger in Supabase (chosen):** per-feature/per-model/per-member attribution, same RLS model as the rest of the app, exportable.
- **AI Gateway observability only:** no member or feature attribution; the direct-Anthropic path (Stylist) isn't covered.

## Decision

- `public.ai_usage_events` (migration `20261005_ai_usage_events.sql`): counts + `est_cost_micros` only — never prompts, replies, or images. FORCE RLS; members may SELECT their own rows; no member write policies, so writes come only from the service role.
- `recordAiUsage()` in `src/lib/ai-usage.ts` is fire-and-forget and never fails a member request. `complete()` / `stream()` record automatically; Nova, Camera and Stylist record explicitly.
- Admin view `/settings/ai-usage`; read-only export `GET /api/admin/ai-usage` (admin session or `AI_USAGE_EXPORT_TOKEN`, ≥ 32 chars, timing-safe compare) feeds `npm run usage:obsidian`.

## Consequences

Costs are list-price estimates (`AI_PRICING_JSON` overrides); the invoice stays the source of truth. One extra insert per model call. The export token is a credential: keep it in Vercel env + the founder's shell only, and rotate it if it leaks.

## Links

- Branch `sean/ai-token-usage`
