# EC8_DEPLOYMENT_AUTHORIZATION

**Phase 7 — Deployment Authorization Review**
**Method:** Audit deployment readiness from source: CI/CD, env vars, providers, monitoring, cron,
backups, recovery. Output an explicit **GO / NO-GO** decision.

---

## 7.1 Production checklist

| Item | Status | Evidence |
|---|---|---|
| Build reproducible | GO | `next build` PASS, 84/84 pages |
| Type/lint/test gates | GO | `validate` exit 0 (202 tests, 0 type errors) |
| CI on push/PR | GO | `.github/workflows/reliability.yml`: validate + migration-safety + e2e |
| Gated release pipeline | GO | `.github/workflows/production-release.yml`: manual dispatch, staging/production environments, full gates, artifact upload |
| Release manifest | GO | `docs/operations/generated/release-manifest.json` generated |
| Migration safety | GO | `ops:migration-audit` PASS (45 migrations) → `migration-safety-report.json` |

## 7.2 Environment variables

| Status | Evidence |
|---|---|
| GO | `.env.example` enumerates all required keys; `ops:env-audit` PASS for local/dev/staging/prod; `ops:secret-scan` PASS (no committed secrets). |

Required groups: Supabase (URL/anon/service-role + storage buckets), Razorpay (key id/secret/webhook
secret + public key), payment provider/webhook secrets, Shiprocket (logistics), VAPID/web-push,
Sentry (DSN/org/project), `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.

## 7.3 Providers

| Provider | Status | Notes |
|---|---|---|
| Supabase (DB/Auth/Storage) | GO | SSR client, RLS, migrations, storage buckets configured |
| Razorpay (payments) | GO | order/verify/webhook routes; signature + replay + idempotency |
| Shiprocket (logistics) | GO (config) | env keys present; logistics routes/subsystem implemented |
| Sentry (monitoring) | GO (with SEC-4 note) | wired via `withSentryConfig`; `global-error.js`/`onRequestError` recommended |

## 7.4 Monitoring & health

| Item | Status | Evidence |
|---|---|---|
| Health endpoint | GO | `app/api/health` (excluded from auth matcher) |
| Readiness endpoint | GO | `app/api/readiness` — env readiness + operational health + launch certification |
| Operational health | GO | `lib/observability/operational-health`, `operations/health` |
| Smoke script | INFO | `ops:smoke` requires a running server; run post-deploy against the live URL |

## 7.5 Cron jobs — **PARTIAL / ACTION REQUIRED**

- `CRON_SECRET` is defined and worker endpoints exist (`app/api/worker`, `ops/async/worker`),
  **but `vercel.json` contains no `crons` array** — no schedule is wired at the platform level.
- **Action before relying on scheduled jobs:** add `crons` entries in `vercel.json` (or an external
  scheduler) hitting the worker endpoints with the `CRON_SECRET`. Non-blocking for initial pilot if
  background jobs are triggered manually/on-demand.

## 7.6 Backups & recovery

| Item | Status | Evidence |
|---|---|---|
| Backup plan | GO | `ops:backup-plan` → `backup-restore-plan.json` |
| Recovery plan | GO | restore procedure captured in the same artifact |
| DB durability | GO | Supabase managed Postgres (provider-level PITR/backups) |

---

## 7.7 Decision matrix

| Gate | Result |
|---|---|
| Build/test/type/lint | GO |
| Security (no open high/critical) | GO (SEC-1 remediated) |
| Env/secrets | GO |
| Providers | GO |
| Monitoring/health | GO |
| Cron scheduling | CONDITIONAL (wire `vercel.json crons` if scheduled jobs needed) |
| Backups/recovery | GO |
| Live load test | CONDITIONAL (recommended pre-GA, not pre-pilot) |

---

## DEPLOYMENT DECISION: **GO (for staging + pilot/production)**

VendorHub is authorized for deployment to staging and a controlled pilot/production launch.
All blocking gates pass and the one high-severity security defect is remediated. Two
**conditional, non-blocking** follow-ups should be tracked: (1) wire `vercel.json` cron schedules
if background automation must run unattended; (2) run a live load test before high-traffic GA.
Add HTTP security headers (SEC-3) and Sentry render-error coverage (SEC-4) as fast-follows.
