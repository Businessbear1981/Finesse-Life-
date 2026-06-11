# Finesse Life — Ops Reference

## THE ONE RULE
`git push` = code backup only. It does NOT deploy.  
The Vercel GitHub webhook is broken (CANCELED immediately every time).  
**Always deploy with the CLI.**

---

## Deploy Frontend (Next.js → Vercel)

```bash
cd C:\Users\sgill\Desktop\finesselife
npm run deploy
# or directly:
vercel deploy --prod --yes
```

- Builds in ~30s, live in ~2 min
- Vercel project: `ardan-edge-capital / finesselife`
- Prod URL: `https://finesselife.app`
- Inspector: `https://vercel.com/ardan-edge-capital/finesselife`

**Workflow:**
```bash
# 1. code the change
# 2. test locally: npm run dev (localhost:3000)
# 3. commit for history: git add . && git commit -m "what you did" && git push
# 4. deploy: npm run deploy
```
Steps 3 and 4 are independent. You can deploy without committing and vice versa.

---

## Database (Supabase)

**Project:** `zcqcgqsovrjlxxiipuzg`  
**Dashboard:** `https://supabase.com/dashboard/project/zcqcgqsovrjlxxiipuzg`  
**Studio (table editor):** `https://supabase.com/dashboard/project/zcqcgqsovrjlxxiipuzg/editor`

**Direct DB connection (for migrations):**
```
host:     db.zcqcgqsovrjlxxiipuzg.supabase.co
port:     5432
database: postgres
user:     postgres
password: Superdog#109918
```

**Run a migration:**
```bash
npm run db:migrate supabase/migrations/your_file.sql
# or: node scripts/migrate.js supabase/migrations/your_file.sql
```

**DO NOT use:**
- `supabase db push` — pooler URL doesn't resolve
- `supabase.rpc('exec_sql')` — no such function
- The Supabase dashboard SQL editor for large files — paste limit

---

## Object Storage (Cloudflare R2)

**For:** media uploads, video files, generated assets  
**Bucket:** `finesse-life`  
**Account:** `50df787328d1b7447491a093136bbe47`  
**Dashboard:** `https://dash.cloudflare.com/50df787328d1b7447491a093136bbe47/r2/default/buckets/finesse-life`  
**Endpoint:** `https://50df787328d1b7447491a093136bbe47.r2.cloudflarestorage.com`

Note: Cloudflare = storage only. DNS is on Porkbun.

---

## DNS (Porkbun)

**Domain:** `finesselife.vip` (and `finesselife.app`)  
**Dashboard:** `https://porkbun.com/account/domainsSpeedy`  
**Porkbun keys:** not yet saved in `.env.local` — add when needed for automation

---

## Backend Python Service (Railway)

**Status: DORMANT** — built but not deployed. All API logic currently lives in Next.js `/api` routes.  
**What it would do:** heavy AI agent orchestration, media pipeline, long-running jobs  
**Project ID:** `e91bd0fe-8810-4216-ae98-3fc79df731df`  
**Dashboard:** `https://railway.app/project/e91bd0fe-8810-4216-ae98-3fc79df731df`

When ready to activate:
1. Go to Railway dashboard → Deploy from `backend/` directory
2. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL=https://finesselife.app`, `ANTHROPIC_API_KEY`
3. Get the Railway public URL (e.g. `https://api-xxx.up.railway.app`)
4. Set `NEXT_PUBLIC_API_URL` in Vercel env vars to that URL
5. Redeploy frontend

---

## Local Dev

```bash
cd C:\Users\sgill\Desktop\finesselife
npm run dev   # → localhost:3000
```

`.env.local` has all keys. Never commit it.

---

## Vercel Env Vars

**To add/change a prod env var:**
1. `https://vercel.com/ardan-edge-capital/finesselife/settings/environment-variables`
2. Add the var
3. Redeploy: `npm run deploy`

**Current Vercel env vars must include:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`
- `AI_GATEWAY_API_KEY`
- `CLOUDFLARE_ACCOUNT_ID`, `R2_*` vars
- `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `ELEVENLABS_API_KEY`
- `EVENTBRITE_API_KEY`
- `INTEGRATIONS_ENCRYPTION_KEY`

---

## Service Summary

| What          | Service         | URL                                           |
|---------------|-----------------|-----------------------------------------------|
| Frontend      | Vercel          | finesselife.app                               |
| Auth + DB     | Supabase        | zcqcgqsovrjlxxiipuzg.supabase.co             |
| File storage  | Cloudflare R2   | finesse-life bucket                           |
| DNS           | Porkbun         | finesselife.vip + finesselife.app             |
| AI (frontend) | Vercel AI GW    | via AI_GATEWAY_API_KEY                        |
| Backend AI    | Railway         | DORMANT — activate when heavy agents needed   |
| Code backup   | GitHub          | Businessbear1981/Finesse-Life-                |
