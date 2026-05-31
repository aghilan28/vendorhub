# EC-7 Phase 9 — Deployment Readiness Certification

**Source:** `vercel.json` (hardened), `.env.example`, `.github/workflows/`, `scripts/ops-*.mjs`, `lib/supabase/`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Vercel | ✅ READY | `vercel.json` with crons + function maxDuration; Next 15 app router |
| Supabase | ✅ READY | 5 typed clients; 50 migrations; RLS |
| Environment variables | ✅ READY | `lib/env.ts` typed; `.env.example` documents required vars; `ops:env-audit` |
| Secrets | ✅ READY | env-based; `ops:secret-scan` gate |
| Build pipeline | ✅ READY | `next build` type-checked (ignoreBuildErrors:false), 98 pages |
| Production pipeline | ✅ READY | `.github/workflows/production-release.yml`, `reliability.yml` |
| Release process | ✅ READY | `ops:preflight` (env + secret + migration + manifest + backup), `validate` composite |

---

## Production Deployment Checklist

### 1. Provision (one-time)
- [ ] Create Supabase project → set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Create Razorpay account → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, webhook secret
- [ ] Create Sentry project → `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- [ ] (Optional) `OPENAI_API_KEY` for AI search; geocoding key for precise hyperlocal
- [ ] Set `CRON_SECRET` (worker authorization)
- [ ] Set production domain in `siteConfig.url` / env

### 2. Database
- [ ] `supabase link` + `supabase db push` (apply 50 migrations)
- [ ] Verify RLS enabled on all sensitive tables
- [ ] (Optional) run catalog seed for a populated demo catalog

### 3. Deploy
- [ ] Connect repo to Vercel; add all env vars
- [ ] Deploy `release/v1-production-ready`
- [ ] Verify cron registered (`/api/worker` every 5 min)
- [ ] Verify security headers via `curl -I` (HSTS/CSP/X-Frame)
- [ ] Verify `/robots.txt` + `/sitemap.xml`

### 4. Smoke
- [ ] `ops:smoke` against the deployed URL
- [ ] Auth flow, payment (test mode), search, order create
- [ ] Confirm `?uiQa=1` does NOT bypass auth in production

**Status: PASS — deployable; checklist is standard SaaS configuration (no engineering blockers).**
