# M0 — Runtime Certification Report (Section 11)

Integrated platform launched via `next start -p 3100` (Ready in 4.7s). Live HTTP probes + screenshots from the running unified deployment.

## 11.1 Route status (live)

| Category | Route | HTTP | Note |
|---|---|:--:|---|
| Marketplace | `/` | 200 | renders |
| Commerce Intelligence | `/commerce-intelligence` | 200 | Command Center |
| Commerce Intelligence | `/pricing`, `/pricing/simulator`, `/pricing/recommendations` | 200 | Pricing Studio |
| Commerce Intelligence | `/forecasting`, `/forecasting/scenarios`, `/forecasting/comparison` | 200 | Forecast Studio |
| Commerce Intelligence | `/inventory-intelligence` | 200 | |
| Commerce Intelligence | `/supply-intelligence` | 200 | |
| Commerce Intelligence | `/routing` | 200 | |
| Commerce Intelligence | `/telemetry` | 200 | |
| Commerce Intelligence | `/search-intelligence` | 200 | |
| Commerce Intelligence | `/recommendations` | 200 | |
| Health | `/api/health` | 200 | liveness |
| Runtime (Phase B) | `/api/runtime/health` | 200 | runtime introspection |
| AI Platform (Phase E) | `/api/ai/health` | 200 | |
| Observability (Phase C) | `/api/metrics` | 200 | |
| Readiness | `/api/readiness` | 503 | **by design**: demo-safe/degraded, full dependency report (Supabase/Razorpay/VAPID unset) |
| Seller / Admin | `/seller/*`, `/admin/*` | auth-gated | build+route confirmed; render needs auth+Supabase |

## 11.2 Runtime evidence
- Server boot: `▲ Next.js 15.5.18 … ✓ Ready in 4.7s` on the integrated branch.
- 14 full-page screenshots captured (1440×900) of marketplace + all 9 intelligence surfaces + 5 studio sub-pages → [`screenshots/`](screenshots/).
- Capture helper: [`scripts/m0-screenshots.mjs`](../../scripts/m0-screenshots.mjs).

## 11.3 Readiness contract (excerpt, `/api/readiness`)
Returns `status: "degraded"`, `environmentMode: "demo-safe"`, with: dependency checks (supabase not_configured), kill-switches, rollback targets, migration-safety policy, critical-table list, and observability tracking. Confirms the **stage-1 production-readiness logic is integrated and live**.

## 11.4 Verdict
> **RUNTIME CERTIFIED.** A single running deployment serves the marketplace and the full commerce-intelligence workspace, plus health/runtime/AI/metrics APIs, all responding correctly. Env-gated 503/auth behavior is deliberate and correct for a secret-less certification host.
