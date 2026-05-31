# Production Readiness Audit

**Method:** Source code + config review on `main`.
**Date:** 2026-05-31

---

## Component Scores

| Component | Status | Evidence |
|-----------|--------|----------|
| Security (auth) | ✅ STRONG | `middleware.ts` Supabase Auth + RBAC via `user_roles` |
| Security (RLS) | ✅ STRONG | **170 `enable row level security` + 254 `CREATE POLICY` statements** across 44 migrations; security-definer helper fns (`current_user_has_role`, `current_user_is_vendor_member`) |
| Security (headers) | ❌ MISSING | `next.config.ts` has NO `headers()` — no HSTS/CSP/X-Frame-Options |
| Security (dev bypass) | ⚠️ RISK | `middleware.ts`: `?uiQa=1` OR `NODE_ENV=development` skips ALL auth checks |
| Rate limiting | ✅ PRESENT | 18 routes via `lib/security/rate-limit.ts` + `lib/payments/rate-limit.ts`; in-memory (per-instance) |
| Performance | ✅ GOOD | `phase_26_performance_scalability` indexes, `lib/performance/` cache policies, pgvector |
| Monitoring | ✅ PRESENT | Sentry (`sentry.client/server/edge.config.ts`), `instrumentation.ts` |
| Logging | ✅ PRESENT | `lib/production/observability.ts` `recordOperationalEvent`, structured events |
| Analytics | ⚠️ PARTIAL | `search_analytics` table, operational events; no product analytics (GA/Mixpanel) |
| Error tracking | ✅ PRESENT | Sentry + `AppError` + error boundaries (`error.tsx` per route group) |
| Backups | ⚠️ EXTERNAL | `scripts/ops-backup-plan.mjs`; relies on Supabase PITR (not verifiable in code) |
| SEO | ❌ MISSING | No sitemap, no robots.txt, no JSON-LD structured data |
| Accessibility | ⚠️ PARTIAL | `accessibility-announcer`, Playwright `@axe-core` tests, but not comprehensively audited |
| Mobile | ✅ GOOD | Responsive components, `mobile-nav`, `mobile-store` |
| PWA | ✅ STRONG | Service worker, offline page, install prompt, manifest |
| Deployment | ❌ NOT DONE | No production deployment; `vercel.json` has NO crons (async worker unscheduled) |
| Build safety | ❌ DISABLED | `next.config.ts`: `ignoreBuildErrors: true` hides TypeScript errors at build |
| Image config | ❌ INCOMPLETE | Only `images.unsplash.com` whitelisted; Supabase storage images would break |
| CI/CD | ⚠️ PARTIAL | `.github/workflows/production-release.yml`, `reliability.yml`; `ops:preflight` blocked by secret-scan false positive |

---

## CORRECTION TO PRIOR AUDITS

⚠️ **My earlier (same-session) Executive Report and prior MCP-1F security claims stated RLS was weak (1 migration, 4 policies). THIS WAS WRONG — a flawed grep.** Re-verified: **170 RLS-enable statements and 254 CREATE POLICY statements exist.** RLS is one of the STRONGEST areas, not a gap. This correction is logged here as required by the "no audit drift" mandate.

---

## Critical Production Findings

| Finding | Severity | Evidence |
|---------|----------|----------|
| `ignoreBuildErrors: true` | HIGH | Type errors silently pass build |
| No HTTP security headers | HIGH | `next.config.ts` lacks `headers()` |
| `uiQa=1` auth bypass | HIGH | Anyone appending `?uiQa=1` skips auth — must be removed for prod |
| No async worker cron | MEDIUM | `vercel.json` empty; queue never drains automatically |
| In-memory rate limit | MEDIUM | Resets on serverless cold start |
| Image host incomplete | MEDIUM | Supabase storage not whitelisted |
| No SEO primitives | MEDIUM | No sitemap/robots |
| Secret-scan false positive | LOW | Blocks `ops:preflight` |

---

## Verdict

**Score: 6/10.** Strong foundations: extensive RLS (corrected finding), real auth + RBAC, rate limiting, Sentry, PWA, performance indexes. Concrete gaps are deployment-hardening items, not architecture: security headers, build-error enforcement, the `uiQa` bypass, async cron, and image host config. All are low-effort fixes (hours, not weeks).
