# EC-7 Phase 7 — Observability Certification

**Source:** `sentry.{client,server,edge}.config.ts`, `instrumentation.ts`, `lib/production/observability.ts`, `lib/observability/`, `lib/autonomous-operations/observability.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Logging | ✅ REAL | `recordOperationalEvent(level, event, meta, {domain, error})` structured events |
| Error tracking | ✅ REAL | Sentry (3 configs) + `instrumentation.ts`; `AppError` + error boundaries per route group |
| Monitoring | ✅ REAL | `lib/observability/operational-health.ts` (live DB counts); `/api/operations/health` |
| Alerting | ✅ REAL | `lib/observability/alerts.ts`; operations-center `generateAlerts` (threshold) |
| Operational visibility | ✅ REAL | `/admin/operations` 9-tab center |
| Incident visibility | ✅ REAL | incident lifecycle + `/admin/operations` Incidents tab + autonomous incident-intelligence |
| Marketplace visibility | ✅ REAL | health-by-domain snapshot + KPIs |
| Audit visibility | ✅ REAL | `audit_logs` + `/admin/audit-logs` |

---

## Can operators diagnose failures?
**YES.** Failure paths emit structured operational events (with `correlationId`, `domain`, `error`) to logs + Sentry. Health endpoints (`/api/health`, `/api/readiness`, `/api/operations/health`) report status. The operations center surfaces alerts + risks with suggested actions. Incident management captures timeline + postmortem.

## Honest scope
Sentry/log aggregation require DSN + provider config at deploy (`SENTRY_DSN`); without it, events log locally and the app degrades safely. Dashboards (Grafana/hosted) are operational config, not code gaps.

**Status: PASS — operators can diagnose failures.**
