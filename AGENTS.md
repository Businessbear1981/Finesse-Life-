<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finesse Life — Agent Charter

> This file is the portable core for any agent or human working in this repo.
> Read it first, then read `docs/STATE.md` for what is actually built and live.

## What this is

Finesse is a luxury social-connection / lifestyle platform — a 1920s grand-hotel UX (art deco, brass/oxblood, Payload shell) wrapping an AI concierge (Nova/Stylist), curated commerce (Wardrobe/Exchange), date planning, and a member rebate card program (Vault). Sean Gilmore is **sole founder**; Kevin Olson is CTO-for-build. Production is the PWA at **finesselife.vip**; App Store v1 comes later. Current stage gate: demand-side confirmation → then the paid-membership transact sprint ("done" = a member can pay and the platform transacts). Domain vocabulary is canonical in [`CONTEXT.md`](CONTEXT.md) — use its terms (Tab, Vault, Concierge, Journey, Rail, Mezzanine), don't drift.

## Architecture map

| Layer | What | Canonical production |
|---|---|---|
| Frontend **and** API | Next.js 16 App Router at repo root (`src/`) — ALL live logic, including every `/api/*` route | Vercel `ardan-edge-capital/finesselife` → **`finesselife.vip`** (`finesselife.app` is NOT serving — verified 2026-07-14) |
| Deploys | **CLI only:** `npm run deploy` (`vercel deploy --prod --yes`). The Vercel GitHub webhook is broken — `git push` does NOT deploy | — |
| Database + Auth | Supabase | **`zcqcgqsovrjlxxiipuzg`** (Sean's org). Migrate via `npm run db:migrate <file>` — NOT `supabase db push` (pooler URL doesn't resolve) |
| Object storage | Cloudflare R2, bucket `finesse-life` (storage only; DNS is Porkbun) | — |
| AI | Anthropic Claude via Vercel AI Gateway (Nova / Stylist concierge) | — |
| Backend | None — all server logic is Next.js `/api` routes on Vercel. The old FastAPI/Railway scaffold was deleted (ADR-0002); do not reintroduce a second server surface without a new ADR | — |

```
Finesse-Life-/
├── src/app/            Next.js App Router — ACTIVE. (auth)/ (hotel)/ rooms, api/ (all live server logic)
├── src/components/     UI — Payload shell (rails, tiles) + hotel skin
├── supabase/           SQL migrations (run via npm run db:migrate)
├── docs/
│   ├── STATE.md        current built/wired/live state (read at session start)
│   ├── decisions/      ADRs
│   └── FINESSE_SQL_MANUAL.md
├── CONTEXT.md          domain glossary (canonical vocabulary — Payload, Tabs, Vault…)
└── OPS.md              ops runbook (deploy, env vars, service dashboards)
```

## Session protocol

1. **Start:** read this file, then `docs/STATE.md`, then any GitHub Issue you're picking up.
2. **Work:** the Issue is the unit of scope. Verify load-bearing claims against ground truth (live site, Supabase, Vercel dashboard) before high-stakes changes.
3. **Finish (write-back is the definition of done):** if the session changed project state — infra, schema, decisions, what's-wired status — update `docs/STATE.md` **in the same PR**. Durable choices get an ADR in `docs/decisions/`.

## Git SOP

- All work on short-lived branches named `{person}/{slug}` (e.g. `sean/kitchen`, `ko/vault-fix`); merge via PR; **never direct-to-main, never force-push**.
- Commit at natural checkpoints with conventional messages (`feat:`, `fix:`, `docs:`, `chore:`).
- Remember: merging ≠ deploying here. After merge, deploy explicitly with `npm run deploy`.
- Work tracking: GitHub Issues + PRs on `Businessbear1981/Finesse-Life-`.

## Guardrails (hard rules)

- **Never push to main.** PRs only.
- **Never touch production environment** — Vercel env vars, DNS (Porkbun), Supabase DDL — without explicit confirmation from a principal.
- **Never commit secrets.** Keys live in env vars; the repo carries `.env.example` only. ⚠ `OPS.md` currently contains a committed Supabase DB password — treat those credentials as compromised until rotated; never add more secrets to any tracked file.
- **Never degrade the Payload shell** — the left/right rails, RoomTiles, and top banner are platform structure; the hotel aesthetic is a skin on top, never a replacement (see `CONTEXT.md` → Rail / Hotel Aesthetic).
- **Finesse never holds member funds** (Vault = card-partner float, see `CONTEXT.md` → Vault). Never build money-holding, P2P transfer execution, or card-issuing logic without the partner-contract question resolved.
- Finesse is **not** an adult-content platform — CCBill appears only because dating apps are "high-risk" for processors. Keep all copy/code consistent with that.

## Known gotchas

- **`git push` does not deploy.** The Vercel GitHub webhook cancels immediately every time. Deploy = `npm run deploy`. (OPS.md "THE ONE RULE".)
- **Canonical domain is `finesselife.vip`.** Older docs say `finesselife.app`, but the alias was removed (commit `af49a65`) and `.app` returns nothing (verified 2026-07-14).
- **Committed secret:** `OPS.md` carries the Supabase DB password in plaintext in git history. Rotation pending.
- **`supabase db push` doesn't work** (pooler URL doesn't resolve). Use `npm run db:migrate <sql-file>`.
- **Demo stubs still live** in `src/app/page.tsx` and `src/app/(hotel)/market/page.tsx` (`DEMO_PIN`, `DEMO_LISTINGS` — never call the real Exchange API). Present as of 2026-07-14.
- **June-23 code audit findings** (`asserted` — pre-dates the Kitchen/Gym/salon work, not re-verified): Scout & Price-Hunter query columns/statuses that don't exist and return nothing; `scale/join` inserts columns absent from `scale_joins` (silent no-op); the Vault credits **12%** cashback with no funding source (prospectus economics say ~1% — this is a bug to fix, not a feature); no checkout/PaymentIntent wiring; the Lab connects Alpaca paper-trading → Finesse is not securities-free.

## Where things live

| What | Where |
|---|---|
| Current built/wired/live state | `docs/STATE.md` |
| Durable decisions (ADRs) | `docs/decisions/` |
| Work tracking | GitHub Issues + PRs on `Businessbear1981/Finesse-Life-` |
| Domain glossary (canonical vocabulary) | `CONTEXT.md` |
| Ops runbook (deploy, env vars, dashboards) | `OPS.md` |
| SQL / schema manual | `docs/FINESSE_SQL_MANUAL.md` |
