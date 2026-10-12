# Finesse Life

All agent context lives in [AGENTS.md](AGENTS.md) — read it first, then `docs/STATE.md` for current state.
Do not add content here; this file is a pointer so every tool shares one source of truth.

Stack at a glance (details in [ADR-0002](docs/decisions/0002-cloudflare-edge-neon-postgres-workos.md)):
Neon Postgres via Hyperdrive · Hono API on Cloudflare Workers (`api.finesselife.vip`) · Queues · R2 ·
WorkOS auth (passkeys, step-up) · Next.js on Vercel · Railway for long jobs. Supabase is retired; do not add it back.
Never commit secrets. The Supabase password once committed in `OPS.md` must be rotated.
