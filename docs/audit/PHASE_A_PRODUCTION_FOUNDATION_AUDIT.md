# KARTEX / VendorHub — Phase A Production Foundation Audit

**Audit type:** Reality audit (no build). Evidence-based against the repository at the audited commit.
**Scope:** Tier 1–3 marketplace foundation productionization.
**Auditor roles:** Principal Production / Platform / Reliability / Security / Database / Infrastructure / DevOps / Commerce Systems Engineer.
**Method:** Static inspection of source, migrations, configuration, CI, scripts, and tests. No live environment was reachable, so any item requiring a running service/secret is marked **VERIFY-LIVE**.

> Convention: Status = `EXISTS` (real, wired) · `PARTIAL` (present but incomplete/unsafe) · `MISSING` · `BROKEN`. Severity = `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`.

---

## Repository baseline (measured)

| Metric | Value | Evidence |
|---|---|---|
| App/lib TypeScript files | 289 | `find app lib -name '*.ts*'` |
| API route handlers | 37 | `find app/api -name route.ts` |
| SQL migrations | 45 | `supabase/migrations/` |
| `CREATE TABLE` statements | 362 | grep across migrations |
| `CREATE POLICY` statements | 254 | grep across migrations |
| `ENABLE ROW LEVEL SECURITY` | 170 | grep across migrations |
| Unit tests | 33 | `tests/unit/*.test.ts` |
| Integration tests | 1 | `tests/integration` |
| Reliability tests | 1 | `tests/reliability` |
| E2E specs | 5 | `tests/e2e/*.spec.ts` |
| Git history depth | 1 commit | `git log` (squashed) |
| Tracked env files | only `.env.example` | `git ls-files | grep .env` |

**Stack (from `package.json`):** Next.js 15.5.7 (App Router) · React 19 · TypeScript 5.9 · Supabase (`@supabase/ssr`, `@supabase/supabase-js`, Supabase CLI) · Razorpay 2.9.6 · web-push 3.6.7 · `@sentry/nextjs` 10.x · Zustand · TanStack Query · Zod 4 · Tailwind 4 · Playwright · Vitest 4 · i18next.

---

# 1. Repository Reality Report (A.1)

| Subsystem | Status | Evidence | Notes |
|---|---|---|---|
| **Frontend** | EXISTS | `app/(buyer)`, `app/(seller)`, `app/(admin)`, `app/(auth)`, `components/**` | Full route-group app with buyer/seller/admin/auth surfaces, error/loading boundaries, PWA manifest + offline page. |
| **Backend (API)** | EXISTS | 37 handlers under `app/api/**` | Next.js route handlers + a server-action layer (`lib/actions/*`). No separate service. |
| **Database** | EXISTS | 45 migrations, 362 tables | Very large schema spanning Tier/Phase programs. Foundation = `phase_1_marketplace_core.sql` + `tier_1_commerce_foundation.sql`. |
| **Auth** | PARTIAL | `lib/supabase/*`, `middleware.ts`, `lib/security/*`, `supabase/config.toml` | Supabase Auth wired with role middleware; email confirmation disabled; dev/QA bypass present (see §6). |
| **Storage** | PARTIAL / VERIFY-LIVE | `lib/env.ts` bucket config (`product-images`, `vendor-assets`, `profile-images`) | Buckets referenced via env; no bucket-creation migration or policy artifact found in repo. |
| **Search** | EXISTS | `app/api/intelligence/search`, `lib/ai/*`, pgvector migrations (`phase_7`, `phase_21`) | Embedding + search endpoints; relies on embedding refresh worker + DB extensions. |
| **Payments** | EXISTS (real) | `features/commerce-finance/razorpay.ts`, `app/api/payments/razorpay/*`, `lib/payments/orchestration.ts`, `phase_18` migration | Real Razorpay SDK: order, HMAC verify (timing-safe), webhook signature verify + idempotent ingestion, refunds + reconciliation. A simulated `processCommercePayment` path also exists for demo. |
| **Notifications** | PARTIAL | `lib/push/sender.ts` (web-push/VAPID, real), `notifications` table | Web push real; **no email/SMS provider integration** beyond Supabase auth mail. |
| **Admin Portal** | EXISTS | `app/(admin)/admin`, `app/api/admin/*`, `lib/actions/admin.ts` | Moderation (vendor/product), snapshot. Server actions lack explicit role guards (RLS-reliant) — see §6. |
| **Seller Portal** | EXISTS | `app/(seller)/seller`, `app/api/seller/*` | Inventory, order status, snapshot, intelligence. |
| **Analytics** | PARTIAL | `components/dashboard/*`, `app/api/seller/intelligence`, `lib/ai/commerce-intelligence.ts` | Operational/merchant intelligence present; depends on data being ingested. |
| **Realtime** | PARTIAL / VERIFY-LIVE | `supabase/config.toml` realtime enabled; async worker + durable events (`lib/async/*`) | Async job/event processing real; Supabase realtime channel usage not confirmed in foundation flows. |
| **Logistics** | EXISTS (real) | `lib/logistics/providers/shiprocket.ts` (live Shiprocket API + token cache), `app/api/logistics/*` | Real provider with self-delivery fallback when creds absent. |
| **Observability** | EXISTS | `instrumentation.ts` + `sentry.*.config.ts`, `lib/production/observability.ts`, `lib/observability/*` | Sentry wired + custom structured operational events; health/readiness endpoints query DB. |

**Verdict:** The foundation is **substantially implemented against live services** (not mocks) — Razorpay, web-push, Shiprocket, Supabase are real integrations. The principal risks are not "missing code" but **safety, isolation, idempotency-of-deploy, and verification gaps**.

---

# 2. Environment Readiness Report (A.2)

| Area | Status | Evidence | Finding |
|---|---|---|---|
| Env separation declared | EXISTS | `config/environments.json` | Four isolated envs (local/dev/staging/production) with distinct Supabase project refs, telemetry scopes, storage buckets; production secrets scoped to prod only. |
| Env template | EXISTS | `.env.example` | Complete variable surface documented. |
| Central env access | EXISTS | `lib/env.ts` | Single typed accessor; `futureIntegrations` gate for Shiprocket etc. |
| Secret hygiene in repo | EXISTS (clean) | git scan | No live secrets in source/history; only `.env.example` tracked. |
| Deploy config | **PARTIAL / BROKEN** | `vercel.json` | **`vercel.json` is effectively empty** — no `crons`, no security headers, no region pinning. The async worker (`app/api/ops/async/worker` GET) is written to be driven by a Vercel cron (`workerId: "vercel-cron-phase31"`), but **no cron is defined anywhere** → background processing will not run in production. |
| Feature flags / kill switches | EXISTS | `config/release-safety.json` | Release gates, kill switches, backup/restore drill requirements declared. |
| Env audit tooling | EXISTS | `scripts/ops-env-audit.mjs` | CI-enforced isolation checks. |

**Critical/High issues**
- **HIGH — No scheduled execution for background workers.** `vercel.json` defines no `crons`; durable events, reconciliation, embedding refresh, notification delivery will not be triggered. (Operational dead-letter accumulation.)
- **MEDIUM — No security/transport headers** in deploy config (CSP, HSTS, X-Frame-Options, Referrer-Policy).
- **MEDIUM — Storage bucket provisioning is implicit** (env-named only); no migration/policy guarantees buckets + RLS exist per environment.

---

# 3. Database Certification Report (A.3)

| Area | Status | Evidence | Finding |
|---|---|---|---|
| Foundation schema | EXISTS | `20260525151000_phase_1_marketplace_core.sql` (27 tables, 63 policies) and `20260529020000_tier_1_commerce_foundation.sql` (18 tables, 38 policies) | Two distinct "commerce foundation" migrations co-exist. |
| RLS coverage | EXISTS (broad) | 170 `enable row level security`, 254 policies | High policy density; foundation tables have RLS enabled. |
| Atomic checkout | EXISTS | `public.atomic_checkout(...)` in `phase_17_atomic_transaction_engine.sql` | Server-side transactional checkout exists. |
| Payment RPCs | EXISTS | `register_live_razorpay_order`, `record_payment_signature_verification`, `request_order_refund`, `post_refund_financial_adjustment` in `phase_18` | Live payment orchestration is DB-backed. |
| Seed data | EXISTS | `supabase/seed/phase_1_marketplace_seed.sql` + large South-Indian FMCG/produce ingestion migrations | Catalog can be populated; until applied, buyer home shows "Real verified products will appear after ingestion." |
| Migration safety tooling | EXISTS | `scripts/ops-migration-audit.mjs`, `docs/operations/generated/migration-safety-report.json` | Audits destructive ops + RLS on critical tables. |
| Backups / recovery | PARTIAL / VERIFY-LIVE | `docs/operations/DISASTER_RECOVERY_PLAYBOOK.md`, `docs/operations/generated/backup-restore-plan.json` | Plans exist; no evidence of an executed restore drill. |

**Risks**
- **HIGH — Migration non-idempotency / re-run hazard.** `phase_1_marketplace_core.sql` uses **plain `create table public.X` (27 tables, zero `IF NOT EXISTS`)**. Re-application or partial-failure replays will error, complicating recovery and fresh-environment provisioning.
- **HIGH — Foundation duplication ambiguity.** `phase_1_marketplace_core` and `tier_1_commerce_foundation` both model the commerce core. No table-name collision was detected, but the **source-of-truth boundary is undocumented**, risking divergence/orphan tables and confusing RLS reasoning.
- **MEDIUM — Index/constraint certification incomplete (VERIFY-LIVE).** Static review cannot confirm absence of slow queries, missing F//indexes, or orphan rows without a live DB + `EXPLAIN`/`pg_stat`. Requires execution against staging.
- **MEDIUM — Recovery risk:** no proof of tested point-in-time restore.

---

# 4. Secret Management Report (A.4)

**Secret inventory (from `.env.example` / `lib/env.ts`):** Supabase URL + anon + **service-role** key · Razorpay key id/secret + **webhook secret** · VAPID public/private + subject · Sentry DSN · `CRON_SECRET` · Shiprocket email/password · storage bucket names · public API tokens.

| Control | Status | Evidence | Finding |
|---|---|---|---|
| No secrets in repo | EXISTS | git history + source scan clean | Good. |
| Secret scanner | EXISTS | `scripts/ops-secret-scan.mjs` (Razorpay/JWT/key patterns) | CI-enforced. |
| Env isolation policy | EXISTS | `config/environments.json` | Production secrets scoped to prod. |
| Rotation policy | **MISSING** | — | No documented rotation cadence/owner for Razorpay/webhook/VAPID/service-role/CRON secrets. |
| Access policy | PARTIAL | service-role only via `lib/supabase/admin.ts` | Server-only boundary exists; no formal least-privilege/access matrix doc. |
| Leak in client bundle | VERIFY-LIVE | only `NEXT_PUBLIC_*` should ship | Needs a built-bundle grep to certify no server secret leaks. |
| Incident response | PARTIAL | `DISASTER_RECOVERY_PLAYBOOK.md` | DR exists; **no secret-specific leak/rotation incident runbook**. |

**Findings**
- **HIGH — Hardcoded demo credential in a live route.** `app/api/public/v1/events/route.ts` embeds `demoToken = "vh_20260527_org-demo_int-demo_public-demo-token"` and a `tokenHash`, **and defaults the `Authorization` header to that demo token when none is supplied** → the public events endpoint is effectively unauthenticated (see §6).
- **MEDIUM — No rotation policy** and **no client-bundle leak certification**.

---

# 5. Provider Readiness Matrix (A.5)

| Provider | Real | Sandbox | Webhook verify | Retry | Failure handling | Idempotency | Monitoring | Status |
|---|---|---|---|---|---|---|---|---|
| **Razorpay (payments)** | ✅ SDK | ✅ test keys via env | ✅ HMAC, timing-safe + replay window | ✅ async job + event | ✅ reconciliation states | ✅ `webhook_ingestions` upsert on `(provider,event_id)` | ✅ operational events | **EXISTS** |
| **web-push (push notif)** | ✅ VAPID | n/a | n/a | partial | ✅ 410 cleanup | n/a | partial | **EXISTS** |
| **Shiprocket (logistics)** | ✅ live API + token cache | self-delivery fallback | ⚠️ delivery reconciliation, no inbound webhook verify confirmed | partial | ✅ fallback mode | VERIFY | partial | **PARTIAL** |
| **Supabase (auth/db/storage)** | ✅ | ✅ | n/a | n/a | ✅ | n/a | ✅ | **EXISTS** |
| **Sentry (observability)** | ✅ wired | n/a | n/a | n/a | n/a | n/a | ✅ | **EXISTS / VERIFY-LIVE (DSN)** |
| **Email provider** | ❌ | ❌ | — | — | — | — | — | **MISSING** (only Supabase auth mail; confirmations disabled) |
| **SMS provider** | ❌ | ❌ | — | — | — | — | — | **MISSING** |
| **Maps provider** | ❌ | — | — | — | — | — | — | **MISSING/NOT REQUIRED?** (geo handled in-DB) |

**Findings**
- **HIGH — Transactional email/SMS is absent.** "Receive notifications" via email/SMS (order confirmation, password reset deliverability, OTP) cannot be guaranteed. Web-push ≠ email/SMS.
- **MEDIUM — Shiprocket inbound webhook verification not evidenced** (only reconciliation polling).

---

# 6. Authentication & Authorization Certification Report (A.6)

| Control | Status | Evidence | Finding |
|---|---|---|---|
| Supabase auth clients | EXISTS | `lib/supabase/{server,browser,admin}.ts` | Anon for user context; service-role isolated server-only. |
| Role middleware | EXISTS | `middleware.ts` (+ `lib/supabase/middleware.ts`) | Protected/seller/admin route gating via `user_roles`. |
| RLS enforcement | EXISTS (broad) | 254 policies / 170 RLS-enabled | Primary authz mechanism. |
| API guard pattern | PARTIAL | `withSecurity` in 13/37 routes; payment routes guard via underlying actions | Inconsistent — two patterns + several unguarded routes. |
| Server-action guards | PARTIAL | `requireUser` only in `cart.ts`, `wishlist.ts` | `orders.ts`, `products.ts`, `admin.ts` have **no explicit auth/role guard** — RLS-only. |
| Email verification | **BROKEN/OFF** | `supabase/config.toml`: `enable_confirmations = false` | Accounts usable without verified email. |
| Session/token lifecycle | EXISTS | `jwt_expiry = 3600`, SSR cookie refresh | OK. |
| Password reset | PARTIAL / VERIFY-LIVE | Supabase flow | Deliverability unproven (no email provider). |

**Privilege / access findings**
- **CRITICAL — Auth bypass in middleware.** `middleware.ts` short-circuits **all** protected/seller/admin enforcement when `NODE_ENV === "development"` **or** when the request URL contains `?uiQa=1`. If a preview/staging deployment runs in non-production mode, or the `uiQa` branch is reachable, this is a full authorization bypass. **Must be removed/guarded before any shared deployment.**
- **HIGH — Public events API effectively unauthenticated.** `app/api/public/v1/events/route.ts` defaults `Authorization` to a baked-in demo token, returning event data without caller credentials.
- **HIGH — Defense-in-depth gap on mutations.** `createOrderAction` / product create/update/archive / admin actions rely solely on RLS. A single RLS regression = unauthorized write. Add explicit `requireUser`/`requireRole` (the pattern already exists and is used by the seller order-status route via `withSecurity` + `requireAnyRole`).
- **MEDIUM — Worker auth fallback.** `app/api/ops/async/worker` treats requests as authorized when `CRON_SECRET` is unset and `NODE_ENV !== production`. Safe in prod *only if* the secret is set; fails open otherwise.

---

# 7. Commerce Workflow Report (A.7)

### Buyer journey — Signup → Search → Product → Cart → Checkout → Payment → Order → Notification
| Step | State transitions | Status | Failure / recovery | Gap |
|---|---|---|---|---|
| Signup | `auth.users` → `user_roles(BUYER)` | EXISTS | — | Email **not** verified (confirmations off). |
| Search | embedding/keyword query | EXISTS | falls back to keyword | Depends on embedding worker (no cron). |
| Product | live DB fetch | EXISTS | — | Empty until seeds/ingestion applied. |
| Cart | `requireUser` + cart tables | EXISTS | guarded | OK. |
| Checkout | `atomic_checkout` RPC | EXISTS | transactional | Server action lacks explicit guard (RLS-only). |
| Payment | Razorpay order → verify → webhook | EXISTS | idempotent, reconciled | Webhook delivery requires public URL + secret (VERIFY-LIVE). |
| Order | order state machine | EXISTS | reconciliation states | — |
| Notification | web-push + `notifications` | PARTIAL | 410 cleanup | No email/SMS confirmation. |

### Seller journey — Signup → Approval → Product → Inventory → Orders → Fulfillment
| Step | Status | Gap |
|---|---|---|
| Signup/registration | EXISTS (`seller-registration`) | — |
| Approval | EXISTS (`admin/moderation/vendor`) | Admin action RLS-only. |
| Product creation | EXISTS (`products.ts` actions) | No explicit role guard at action layer. |
| Inventory | EXISTS (`api/seller/inventory`) | — |
| Order processing | EXISTS (`api/seller/orders/[orderId]/status` — `withSecurity`+`requireAnyRole`) | Good reference pattern. |
| Fulfillment | EXISTS (Shiprocket / self-delivery) | Inbound webhook verify unconfirmed. |

### Admin journey — Approval / Moderation / Refunds / Disputes / Analytics / Governance
| Step | Status | Gap |
|---|---|---|
| Vendor & product moderation | EXISTS (`api/admin/moderation/*`) | — |
| Refunds | EXISTS (`api/payments/refunds` + refund RPCs) | Route relies on action-layer guard. |
| Disputes | PARTIAL / VERIFY | Governance migrations exist; UI/flow coverage unconfirmed. |
| Analytics | EXISTS (`admin/snapshot`, intelligence) | Data-dependent. |
| Governance | EXISTS (`api/governance/detection`) | **Unguarded route** (no `withSecurity`). |

**Top workflow risks:** background processing has **no scheduler** (payments reconciliation, notifications, embedding refresh stall); notification completeness limited to web-push; several mutation paths are RLS-only.

---

# 8. Testing Readiness Report (A.8)

| Suite | Count | Status | Coverage of foundation | Gap |
|---|---|---|---|---|
| Unit | 33 | EXISTS | logic helpers, pricing, security utils | Good breadth. |
| Integration | 1 | PARTIAL | minimal | No real-DB integration of checkout/payments/auth. |
| Reliability | 1 | PARTIAL | — | Single scenario. |
| E2E (Playwright) | 5 | EXISTS | buyer-flow, accessibility (x2), regression, operational-health | No seller/admin E2E; no payment E2E. |
| Contract | 0 | MISSING | — | No provider/webhook contract tests. |
| DB tests | 0 (RLS) | MISSING | — | No automated RLS/policy assertions. |
| Auth tests | partial (unit) | PARTIAL | — | No end-to-end role/RLS enforcement tests. |
| Payment tests | 0 (live) | MISSING | — | Razorpay verify/webhook idempotency untested in CI. |
| Notification tests | 0 | MISSING | — | — |

**Findings**
- **HIGH — No coverage threshold gate.** Vitest coverage is configured but CI does not fail on regression.
- **HIGH — No RLS/authorization assertion tests** despite RLS being the primary security control.
- **HIGH — Payment + webhook idempotency untested** in CI (the highest-risk money path).

---

# 9. Operability Report (A.9)

| Capability | Status | Evidence |
|---|---|---|
| Structured logging | EXISTS | `lib/production/observability.ts` (`recordOperationalEvent`, trace context) |
| Error handling | EXISTS | `lib/errors.ts` (`AppError`), route `errorJson`, app/route error boundaries |
| Health check | EXISTS | `app/api/health/route.ts` |
| Readiness check | EXISTS | `app/api/readiness/route.ts` (DB-backed) |
| Metrics/tracing hooks | EXISTS | Sentry (`instrumentation.ts` + 3 configs) + Server-Timing headers |
| Alert hooks | PARTIAL | Sentry events; no alert routing/threshold config in repo |
| Backup hooks | PARTIAL | `backup-restore-plan.json`; execution unproven |
| Recovery procedures | EXISTS | `DISASTER_RECOVERY_PLAYBOOK.md`, `PHASE_30_PRODUCTION_RUNBOOK.md` |
| Incident procedures | PARTIAL | DR playbook; no secret-leak/payment-incident runbook |
| Scheduled ops | **BROKEN** | no `crons` in `vercel.json` → workers never fire |
| CI gates | EXISTS | `.github/workflows/reliability.yml` (lint, typecheck, test, ops preflight, migration-safety, build, e2e); `production-release.yml` (gated manual release) |

---

# 10. Phase A Remediation Program (A.10)

> Each item: Problem · Risk · Impact · Dependencies · Implementation · Validation · Rollback · Acceptance · Effort.

### CRITICAL

**C1 — Remove middleware auth bypass (`dev` / `?uiQa=1`).**
- Risk: full authorization bypass on any non-prod/preview deploy. Impact: total data exposure. Deps: none.
- Implementation: delete the bypass branch; if a QA path is required, gate it behind a server-side signed flag never derived from the URL.
- Validation: e2e test asserting protected/seller/admin routes 302→sign-in for anonymous and 403 for wrong role, including `?uiQa=1`.
- Rollback: revert commit. Acceptance: no code path returns early before role checks. Effort: S (0.5d).

**C2 — Lock down `api/public/v1/events` demo token.**
- Risk: unauthenticated event data egress. Impact: data leak. Deps: token issuance source.
- Implementation: remove hardcoded `demoToken`/default Authorization; require a real integration token; 401 on missing.
- Validation: contract test (missing/invalid/valid token → 401/401/200). Rollback: revert. Acceptance: no request succeeds without a valid token. Effort: S.

### HIGH

**H1 — Define background scheduler.** Add `crons` to `vercel.json` (or external scheduler) for the worker GET + reconciliation + embedding refresh; require `CRON_SECRET`.
- Validation: invocation logs + processed-job counters > 0 in staging. Rollback: remove cron. Acceptance: queues/dead-letters drain on schedule. Effort: S–M.

**H2 — Make foundation migrations idempotent + declare source-of-truth.** Convert `phase_1_marketplace_core` tables to `create table if not exists` (or guard), and document whether `phase_1` or `tier_1_commerce_foundation` is canonical; reconcile/retire the other.
- Validation: clean apply on a fresh DB + re-apply without error; `ops-migration-audit` passes. Rollback: keep prior files. Acceptance: reproducible fresh-env provisioning. Effort: M.

**H3 — Add explicit auth guards to mutation server actions** (`orders.ts`, `products.ts`, `admin.ts`) using existing `requireUser`/`requireAnyRole` (defense in depth over RLS).
- Validation: authorization tests per action. Effort: M.

**H4 — Enable email verification + integrate a transactional email/SMS provider** (`enable_confirmations = true`; wire provider for confirmation, password reset, order receipts).
- Validation: signup→verify→signin e2e; provider sandbox delivery. Effort: M.

**H5 — Add CI gates:** coverage threshold, RLS/authorization assertion tests, and payment verify/webhook idempotency tests.
- Validation: CI fails on regression. Effort: M–L.

**H6 — Certify DB live (VERIFY-LIVE):** run `EXPLAIN`/`pg_stat` on foundation queries; add missing indexes; check orphan rows/constraints; execute a restore drill.
- Validation: query latency budget met; documented restore. Effort: M.

### MEDIUM

**M1 — Add security/transport headers** (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) via `vercel.json`/Next config. Effort: S.
**M2 — Storage bucket + RLS provisioning as code** per environment. Effort: S–M.
**M3 — Standardize all API routes on `withSecurity`** (or document why public). Audit the 19 currently-unwrapped routes. Effort: M.
**M4 — Secret rotation policy + client-bundle leak certification + Shiprocket inbound webhook verification.** Effort: M.

### LOW

**L1 — Remove dead `features/products/mock-data.ts`** (orphaned). **L2 — Document worker `CRON_SECRET` fail-open behavior.** **L3 — Consolidate the many Tier/Phase docs into a single foundation source-of-truth index.**

---

# 11. Production Readiness Score

| Dimension | Weight | Score (0–100) | Notes |
|---|---|---|---|
| Deployability | 15% | 45 | Builds + CI exist; **no cron scheduler**, empty `vercel.json`, non-idempotent migrations. |
| Observability | 15% | 70 | Sentry + structured logs + health/readiness; alert routing thin. |
| Security | 20% | 35 | Real RLS breadth, but **middleware bypass + public-token bypass + RLS-only mutations + email verification off**. |
| Recoverability | 15% | 40 | DR/backup plans exist; **no proven restore**, migration re-run hazard. |
| Operability | 15% | 55 | Runbooks + health checks; scheduler broken; incident coverage partial. |
| Auditability | 10% | 65 | Webhook idempotency, operational events, audit flags in `withSecurity`. |
| Commerce completeness | 10% | 60 | Real payments/logistics; notifications limited; catalog data-dependent. |

**Weighted Production Readiness ≈ 50/100 for the foundation slice.**
Program-wide (matching the ~12% baseline framing, which weights the entire Tier 1–15 surface and live verification): **this audit moves verified production readiness from ~12% toward ~18–20%**; completing **C1, C2, H1–H6** is what carries it to the **~25%** Phase A target.

---

# 12. Go / No-Go Decision

## Decision: **NO-GO for production** (foundation is close, but blocked).

**Hard blockers (must clear to reach the Phase A ~25% gate):**
1. **C1** — middleware `dev`/`?uiQa=1` authorization bypass.
2. **C2** — `api/public/v1/events` hardcoded/default demo token.
3. **H1** — no background scheduler (payments reconciliation / notifications / embeddings never run).
4. **H2** — non-idempotent foundation migrations + undeclared source-of-truth (recovery + provisioning risk).
5. **H4** — email verification disabled and no transactional email/SMS provider (account integrity + "receive notifications" requirement unmet).

**Conditional GO for a controlled internal staging** is acceptable **only after C1 + C2** are fixed and the worker `CRON_SECRET` is enforced, to enable the live DB/index/restore/payment-webhook verification (H6 / VERIFY-LIVE items) that static analysis cannot complete.

**Strengths to preserve:** real Razorpay orchestration with idempotent, reconciled webhooks; real web-push and Shiprocket integrations; broad RLS; Sentry + health/readiness; functioning CI with ops preflight and migration-safety gates.

---

### VERIFY-LIVE checklist (cannot be certified by static audit)
- Razorpay webhook reachability + signature on a public URL; refund round-trip.
- DB index usage / slow-query / orphan-row / constraint validation; tested restore.
- No server secret in the built client bundle.
- Storage buckets + policies present per environment.
- Sentry DSN receiving events; alert routing.
