# KARTEX / VendorHub — Phase C Observability & Operational Truth Certification

**Objective:** Make every important event, workflow, failure, dependency, and state transition observable — *nothing important happens silently.*
**Method:** Reality audit → implement vendor-neutral telemetry (metrics + traces + structured logs + alerts) + deployable observability stack → validate (typecheck/test/lint/parse) → certify.
**Safety invariant (enforced):** telemetry is **total and non-blocking** — every recorder is wrapped so a monitoring outage can never break commerce execution. All exporters are flag-gated and degrade to no-ops.

> Authoring-time verification: `tsc --noEmit` exit 0 · `vitest run` **202/202** (35 files) · `eslint` clean · all Phase C IaC validated (YAML + dashboard JSON parse). Items needing a live collector/Prometheus to certify are marked **VERIFY-LIVE**.

---

## What was delivered (maps observability pillars to running infrastructure)

| Pillar | Implemented (real) | Where |
|---|---|---|
| Metrics | dependency-free registry + Prometheus exposition + catalog (24 metrics) | `lib/observability/metrics.ts`, `GET /api/metrics` |
| Traces | OTLP/HTTP exporter + W3C `traceparent` propagation + span wrappers | `lib/observability/otlp.ts`, `instrument.ts` |
| Logs | structured JSON w/ trace+context+secret-redaction (pre-existing, certified) | `lib/observability/core.ts` |
| Business | counters + correlated events for orders/payments/refunds/search/notifications | `lib/observability/business-metrics.ts` |
| Alerts | Prometheus rules (P1–P4) + Alertmanager escalation + inhibition | `infra/observability/alerts.rules.yml`, `alertmanager.yml` |
| Stack | OTel Collector + Prometheus + Grafana + Jaeger + Alertmanager (compose) | `infra/observability/` |
| Dashboards | Executive / Commerce / Infrastructure (auto-provisioned) | `infra/observability/grafana/dashboards/` |

Instrumentation was added at **central choke points** (`errorJson`, `withSecurity`) so existing routes gained metrics **without editing each handler**.

---

# 1. Observability Reality Report (C.1)

| Capability | Status (pre-C) | Evidence |
|---|---|---|
| Structured logging | **EXISTS (good)** | `lib/observability/core.ts` — JSON events, trace/correlation/request IDs, actor/subject/org/vendor context, secret redaction, durationMs |
| Trace context | **PARTIAL** | `createTraceContext`/`childTrace`/`withTrace`/`headersForTrace` exist & used in 26 files — but **never exported** to a backend; custom `x-trace-id`, **not W3C `traceparent`** |
| Sentry | **PARTIAL/BROKEN** | wired in `instrumentation.ts` + 3 configs, but the only custom forward POSTs **raw JSON to the DSN URL** (`forwardToMonitoring`) which Sentry will not ingest → effectively a no-op for custom events |
| Health/Readiness | **EXISTS** | `/api/health`, `/api/readiness`, `/api/runtime/health` (Phase B), plus domain health routes |
| Metrics | **MISSING** | no counters/histograms; domain `*/observability.ts` compute on-demand Postgres snapshots, not time-series |
| OpenTelemetry | **MISSING** | no `@opentelemetry/*` / `@vercel/otel` |
| Prometheus / Grafana / Jaeger | **MISSING** | no scrape config, dashboards, or tracing backend |
| Alerting | **PARTIAL** | `lib/observability/alerts.ts` derives in-app operational alerts; **no** Prometheus rules / Alertmanager / severity model / escalation artifacts |

**Per-subsystem visibility (pre-C):** Frontend ◑ (Sentry client) · Backend ◑ (logs only) · Database ◑ (health snapshots) · Kafka/Redis/Neo4j/Qdrant/Flink ✗ (Phase B health booleans only) · Workers/Queues ◑ (logs) · Cron ✗ (none scheduled) · Providers ◑ (logs on error). **Conclusion: KARTEX could log, but could not *measure* or *trace* — it could not answer "how much / how slow / where" within minutes.**

---

# 2. Telemetry Architecture Report (C.2)

**Model:** vendor-neutral. App emits **OTLP** (push) for traces + **Prometheus** (pull) for metrics + **structured JSON logs** (stdout → log pipeline). One Collector fans out to Jaeger (traces) and Prometheus (metrics).

| Service / surface | Owner | Telemetry contract | Collection | Retention | Sampling | Security |
|---|---|---|---|---|---|---|
| Web app (routes/actions) | platform | RED metrics + spans + logs | OTLP push + `/api/metrics` pull | metrics 15d, traces 7d | traces 10% prod / 100% non-prod (Sentry rate mirrored) | `/api/metrics` bearer; OTLP header auth; secrets redacted |
| Workers / queues | platform | queue depth, job latency, failures | OTLP push | 15d | 100% errors | cron-secret guarded |
| Phase B runtimes | platform | exporters → Prometheus | pull | 15d | n/a | network-policy scoped |
| External providers | payments/logistics | dependency latency + errors (`instrumentDependency`) | OTLP + metrics | 15d | 100% errors | no PII in attributes |
| Business outcomes | domain owners | counters + correlated events | metrics + logs | 90d (events) | 100% | aggregate only |

**Cardinality discipline:** routes recorded as **templates** (`/api/seller/orders/:id/status`), status bucketed to `2xx/4xx/5xx`, no raw IDs/URLs in metric labels; collector also deletes `http.url`/`authorization` defensively.

---

# 3. Trace Coverage Report (C.3)

**Implemented spans / propagation:**
- `withApiObservability(route, request, handler)` — server span per request, continues inbound `traceparent`, sets `traceparent` + `x-trace-id` on the response, records RED metrics, exports span.
- `instrumentDependency(dependency, op, fn)` — client spans for redis/kafka/neo4j/qdrant/flink/supabase/provider calls + dependency metrics.
- `withSpan(domain, name, fn)` — internal spans for server actions / workflow steps.
- `withSecurity` now times + counts every guarded route (13+ routes today) — coverage without per-route edits.

| Target | Mechanism | Status |
|---|---|---|
| API routes | `withApiObservability` + `withSecurity` auto-instrumentation | **READY** (wrap remaining unguarded routes = C-H1) |
| Server actions | `withSpan` | **READY** (apply to checkout/payment/order = C-H1) |
| Kafka/Redis/Neo4j/Qdrant/Flink | `instrumentDependency` | **READY** (wire inside `lib/runtime/*` = C-H2) |
| Supabase / providers | `instrumentDependency` | **READY** |
| W3C propagation | `traceparent` in/out | **DONE** |

**Export:** OTLP-JSON → Collector → Jaeger, gated by `RUNTIME_OTEL_ENABLED` + `OTEL_EXPORTER_OTLP_ENDPOINT`. **VERIFY-LIVE:** end-to-end span continuity across a real collector.

---

# 4. Metrics Catalog (C.4)

Registered in `lib/observability/metrics.ts`; thresholds/alerts in `alerts.rules.yml`.

| Metric | Type | Owner | Threshold (alert) |
|---|---|---|---|
| `kartex_api_requests_total` | counter | platform | — (throughput) |
| `kartex_api_errors_total` | counter | platform | 5xx rate > 5% (P2) |
| `kartex_api_request_duration_seconds` | histogram | platform | p95 > 1.5s (P3) |
| `kartex_queue_depth` | gauge | platform | > 5000 (P2) |
| `kartex_kafka_consumer_lag` | gauge | platform | > 10000 (P2) |
| `kartex_redis_cache_hits/misses_total` | counter | platform | hit ratio panel |
| `kartex_dependency_duration_seconds` | histogram | platform | p95 panel |
| `kartex_dependency_errors_total` | counter | platform | > 1/s per dep (P2) |
| `kartex_runtime_up` | gauge | platform | == 0 (P1) |
| `kartex_orders_created/completed/failed_total` | counter | commerce | no orders 30m (P2) |
| `kartex_checkout_attempts/success_total` | counter | commerce | success < 85% (P1) |
| `kartex_payments_authorized/failed_total` | counter | payments | fail > 10% (P1) |
| `kartex_refunds_requested/completed_total` | counter | payments | reconciliation panel |
| `kartex_search_queries/zero_results_total` | counter | discovery | zero-result > 30% (P3) |
| `kartex_notifications_sent/failed_total` | counter | engagement | fail > 20% (P3) |
| `kartex_inventory_drift` | gauge | commerce | drift panel |

Exposition verified well-formed (HELP/TYPE/bucket/sum/count). Retention: Prometheus 15d (raw) → long-term store optional.

---

# 5. Dashboard Inventory (C.5)

Auto-provisioned (Grafana folder **KARTEX**):
1. **Executive Overview** — orders, checkout %, payment %, API 5xx %, orders trend, runtime reachability.
2. **Commerce Operations** — payments auth/failed, refunds requested/completed, search vs zero-result, notifications sent/failed by channel.
3. **Infrastructure & Runtimes** — API p95 by route, dependency p95, Kafka lag, queue depth, Redis hit ratio, dependency error rate, runtime up.

Each panel answers *healthy / degraded / failing* via thresholds. **Remaining dashboards (orders deep-dive, payments deep-dive, AI/Knowledge/Governance runtime) tracked as C-M1** (panels are trivial once their exporters/metrics emit). Jaeger UI provides the trace-explorer "dashboard" for journeys.

---

# 6. Traceability Report (C.6)

| Journey | Reconstructable via | Status |
|---|---|---|
| Buyer (browse→cart→checkout→pay→order→notify) | server spans + `business.*` events + `traceparent` | **READY** — wrap checkout/payment actions (C-H1) |
| Seller (onboard→product→inventory→order→fulfill) | `withSecurity` route spans + action spans | **READY** |
| Admin (approve/moderate/refund) | route spans + audit events | **READY** |
| Order journey | `kartex.orders.order.lifecycle` (Phase B) + spans keyed by orderId | **READY** |
| Payment journey | payment spans + `business.payment.*` + `webhook_ingestions` idempotency | **READY** |
| Notification journey | `business.notification.*` + dispatch topic | **READY** |
| Search / knowledge retrieval | `business.search.query` + Qdrant/Neo4j dep spans | **READY** |

Every workflow carries a single `traceId` from inbound request through dependencies (W3C propagation) and is queryable in Jaeger by `traceId`/route/error. **VERIFY-LIVE:** full reconstruction on a live collector once C-H1/C-H2 wiring lands.

---

# 7. Logging Certification Report (C.7)

**Certified strengths (pre-existing, validated):** structured JSON; correlation/request/trace IDs; actor/subject/org/workspace/vendor context; per-event `domain` + `level` + `durationMs`; **secret redaction** (`password|secret|token|signature|authorization|cookie|credential|kyc|pan|aadhaar|card|cvv|otp|key`); value truncation; error normalization (stack stripped in prod); only **1** raw `console.*` in the codebase (logging is centralized).
**Added:** business-outcome logs (`business.*`) emitted alongside metrics; trace IDs now align with exported spans + `traceparent`.
**Findings / remediation:** (a) the custom **Sentry forward is non-functional** (raw POST to DSN) → route logs to `OBSERVABILITY_INGEST_URL` (OTLP/log collector) instead — **C-H3**; (b) ship stdout JSON to a log store (Loki/managed) for search/audit — **C-M3**.

---

# 8. Incident Response Report (C.8)

**Severity model:** **P1** page-now (revenue/data-loss: payment fail >10%, checkout <85%, runtime down), **P2** page-business-hours (API 5xx >5%, Kafka lag, queue depth, no-orders-30m), **P3** ticket (latency p95, notification/search quality), **P4** informational.
**Escalation (Alertmanager):** severity-matched receivers (`pager-immediate` / `pager-businesshours` / `default-ticket` / `info-feed`), `group_by [alertname, domain]`, P1 `repeat 30m`, and **inhibition** (a domain P1 silences that domain's lower-severity noise).
**Runbooks:** alerts link to `docs/operations/PHASE_30_PRODUCTION_RUNBOOK.md` + `DISASTER_RECOVERY_PLAYBOOK.md`. **Per-alert runbook stubs are C-M4.**
**Coverage:** API, payment, checkout, queue, Kafka, runtime (Redis/Neo4j/Qdrant/Flink via `kartex_runtime_up` + exporters), dependency/provider, notifications, search, app-down heartbeat. **VERIFY-LIVE:** real PagerDuty/Slack receivers + a fire drill.

---

# 9. Business Intelligence Report (C.9)

`businessMetrics.*` records a **counter + a correlated event** for each outcome (never silent).

| Business metric | Owner | Threshold | Dashboard | Alert |
|---|---|---|---|---|
| Orders created/completed/failed | commerce | no orders 30m | Executive | P2 |
| Checkout success rate | commerce | < 85% | Executive | P1 |
| Payments authorized/failed | payments | fail > 10% | Commerce | P1 |
| Refund success rate | payments | watch | Commerce | — |
| Search effectiveness (zero-result) | discovery | > 30% | Commerce | P3 |
| Notification success rate | engagement | fail > 20% | Commerce | P3 |
| Inventory drift | commerce | watch | Infra | — |
| Seller activation / buyer conversion / recommendation CTR | growth | — | **derive from events (C-M5)** | — |

Helpers exist; **emission must be wired at the workflow points** (checkout/payment/order/search/notification actions) — that wiring is **C-H1** (low-risk, additive).

---

# 10. Operational Truth Gap Analysis (C.10)

| Question | Answer today | Gap |
|---|---|---|
| Can every critical workflow be **traced**? | Infrastructure is ready (spans + W3C + Jaeger); not yet wired into checkout/payment actions | C-H1/C-H2 |
| Can every failure be **detected**? | API/business/runtime alerts defined; needs live Prometheus + emission wiring | C-H1, VERIFY-LIVE |
| Can every dependency be **monitored**? | `instrumentDependency` ready; runtime exporters not deployed | C-H2, C-M2 |
| Can every incident be **diagnosed**? | logs+traces+metrics correlate by traceId once wired | C-H1, C-H3 |
| Can every recovery be **verified**? | health/readiness + runtime gauges exist; needs alert-resolves + drill | VERIFY-LIVE |

**Identified blind spots:** (1) **serverless metric aggregation** — pull `/api/metrics` only aggregates on persistent deploys; serverless needs push (OTLP/Pushgateway). (2) **Cron/worker has no scheduler** (carried from A/B) → background telemetry won't flow until scheduled. (3) **Sentry custom-forward broken**. (4) runtime exporters not yet deployed. (5) business emission points not yet wired.

---

# 11. Phase C Remediation Program (C.11)

> Each: Problem · Risk · Impact · Deps · Implementation · Validation · Rollback · Acceptance · Effort.

### CRITICAL
**C-C1 — Scheduler for workers (carried from A/B).** Risk: no background metrics/traces/alerts flow; reconciliation silent. Impl: add `vercel.json` crons (or external) hitting worker w/ `CRON_SECRET`. Validation: `kartex_queue_depth`/job metrics non-zero in staging. Rollback: remove cron. Acceptance: scheduled runs visible in metrics+traces. Effort: S.

### HIGH
**C-H1 — Wire instrumentation into critical paths.** Wrap checkout/payment/order/search/notification server actions with `withSpan` + `businessMetrics.*`; wrap unguarded API routes with `withApiObservability`. Validation: traces + business counters appear for a synthetic order. Rollback: remove wrappers. Acceptance: buyer journey reconstructable in Jaeger; checkout/payment metrics populate. Effort: M.
**C-H2 — Instrument Phase B adapters.** Wrap `lib/runtime/*` calls with `instrumentDependency`; emit `kartex_kafka_consumer_lag`/`kartex_queue_depth` from worker. Validation: dependency latency + lag visible. Effort: M.
**C-H3 — Fix telemetry forwarding.** Replace raw-DSN POST with OTLP/log export to `OBSERVABILITY_INGEST_URL` (and proper `Sentry.captureException` for errors). Validation: error appears in sink/Sentry. Effort: S–M.

### MEDIUM
**C-M1** remaining dashboards (orders/payments deep-dive, AI/Knowledge/Governance). **C-M2** deploy runtime exporters (redis/kafka/neo4j) in compose + prod. **C-M3** ship stdout JSON to Loki/managed log store (search/audit retention). **C-M4** per-alert runbook stubs. **C-M5** derive seller-activation/buyer-conversion/CTR from event stream.

### LOW
**C-L1** Grafana SSO + dashboards-as-code in CI. **C-L2** trace sampling tuning per route. **C-L3** synthetic/RUM monitoring for frontend journeys.

---

# 12. Observability Readiness Score

| Pillar | Score | Notes |
|---|---|---|
| Logging | 80 | strong, centralized, redacted; forward broken (C-H3) |
| Metrics | 65 | registry + catalog + exposition done; emission wiring + serverless aggregation pending |
| Tracing | 60 | exporter + W3C + wrappers done; path wiring + live verify pending |
| Dashboards | 60 | 3 core dashboards provisioned; deep-dives pending |
| Alerting | 62 | rules + severity + escalation defined; live receivers + drill pending |
| Business observability | 58 | helpers + metrics defined; emission points pending |

**Weighted Observability Readiness ≈ 64/100.** The *capability to explain* is built and build-safe; the remaining work is **wiring emission into hot paths + standing up the live stack** (C-C1, C-H1..H3).
**Program effect:** moves overall production readiness from **~35% toward ~40–42%** now; reaches the operational-truth bar once C-C1 + C-H1..H3 are complete and VERIFY-LIVE.

---

# 13. Runtime Visibility Matrix

| Subsystem | Metrics | Traces | Logs | Health | Alert |
|---|---|---|---|---|---|
| API routes | ✅ (auto via guard/wrapper) | ✅ wrapper | ✅ | ✅ | ✅ |
| Server actions | ◑ (wire C-H1) | ✅ `withSpan` | ✅ | n/a | ◑ |
| Workers/queues | ◑ (emit C-H2) | ✅ | ✅ | `/api/ops/async/health` | ✅ |
| Kafka | ◑ exporter (C-M2) | ✅ dep span | ✅ | runtime health | ✅ lag |
| Redis | ◑ hit/miss + exporter | ✅ dep span | ✅ | runtime health | ✅ up |
| Neo4j | ◑ exporter (C-M2) | ✅ dep span | ✅ | runtime health | ✅ up |
| Qdrant | ✅ `/metrics` | ✅ dep span | ✅ | runtime health | ✅ up |
| Flink | ✅ `/metrics` | ✅ | ✅ | runtime health | ✅ |
| Supabase/DB | ◑ dep metrics | ✅ dep span | ✅ | `/api/readiness` | ◑ |
| Providers (Razorpay/Shiprocket/web-push) | ✅ dep metrics | ✅ dep span | ✅ | — | ✅ errors |

Legend: ✅ implemented/ready · ◑ partial (remediation referenced).

---

# 14. Incident Readiness Matrix

| Failure | Detect | Severity | Escalation | Runbook |
|---|---|---|---|---|
| API failure | `kartex_api_errors_total` | P2 | businesshours | runbook#api |
| Payment failure | `kartex_payments_failed_total` | P1 | immediate | runbook#payments |
| Checkout collapse | checkout success rate | P1 | immediate | runbook#commerce |
| Queue backlog | `kartex_queue_depth` | P2 | businesshours | runbook#async |
| Kafka failure/lag | `kartex_kafka_consumer_lag` / up | P1/P2 | immediate | runbook#kafka |
| Redis/Neo4j/Qdrant/Flink down | `kartex_runtime_up==0` | P1 | immediate | runbook#runtime |
| Provider failure | `kartex_dependency_errors_total` | P2 | businesshours | runbook#providers |
| Worker failure | job metrics / heartbeat | P2 | businesshours | runbook#async |
| Database failure | readiness + dep errors | P1 | immediate | DR playbook |
| App blind (no metrics) | `up{job=kartex-app}==0` | P2 | businesshours | runbook#observability |

---

# 15. Go / No-Go Decision

## Decision: **CONDITIONAL GO** — observability foundation is real, build-safe, and mergeable; **full operational truth is NOT yet certified.**

- **GO to merge + enable in staging:** metrics registry, `/api/metrics`, OTLP tracing, business-metric helpers, the Collector/Prometheus/Grafana/Jaeger/Alertmanager stack, dashboards, and alert rules all exist and validate; existing build is unaffected (tsc/test/lint green); telemetry is non-blocking and flag-gated.
- **NO-GO for "nothing happens silently" certification** until: **C-C1** (scheduler so background signals flow), **C-H1** (emit business metrics + spans on checkout/payment/order/search/notification), **C-H2** (instrument runtime adapters + emit lag/queue depth), **C-H3** (fix error forwarding) — then VERIFY-LIVE on the running stack (traces end-to-end in Jaeger, alerts firing/resolving through Alertmanager).

**Net:** KARTEX now *has the machinery* to explain itself; Phase C completion = wiring that machinery into the hot paths and proving it on a live stack.

---

### VERIFY-LIVE checklist
- OTLP spans visible end-to-end in Jaeger across a real Collector; trace continuity buyer→payment.
- Prometheus scraping `/api/metrics` (+ runtime exporters); dashboards populate.
- Alerts fire and resolve through Alertmanager to real receivers (P1 drill).
- Serverless metric strategy confirmed (push/Pushgateway) vs persistent pull.
- Log store ingest + retention + searchability (audit).
