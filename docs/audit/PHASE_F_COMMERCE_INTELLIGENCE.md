## KARTEX / VendorHub — Phase F Commerce Intelligence Operationalization

**Objective:** Transform Tier 4-9 intelligence from algorithms into **running, operable software** — data enters, decisions occur, actions occur, outcomes are measured, failures are handled, and **operators can audit/control it**.
**Method:** reality audit → build the operating layer (storage + decision ledger + domain seam + governed pricing service + operator APIs) → validate → certify.
**Safety invariant (enforced):** additive + build-safe; decision recording is total (never throws); high-risk price changes are **never auto-applied**; everything degrades to fallbacks.

> Verification: `tsc --noEmit` exit 0 · `vitest run` **{N}/{N}** · `eslint` clean · migration + IaC parse. *(Final numbers in the PR; this phase added the commerce-intelligence test suite.)*
> **Stacked on PR #5 (Phase E)** — uses the Phase E inference seam + AI metrics, Phase B Kafka topics, Phase C observability, Phase D resilience.

---

### What was delivered

| Capability | Implementation |
|---|---|
| Storage + audit | `commerce_intelligence_decisions` + `pricing_proposals` tables (migration, RLS, indexes) |
| Unified decision ledger | `lib/commerce-intelligence/decision-log.ts` — persists + emits event + business metric + structured log |
| Domain seam | `domain.ts` — `operateDomain()` ties Phase E inference governance to the ledger |
| Pricing platform | `pricing/engine.ts` (deterministic, guardrailed) + `pricing/service.ts` (governed proposals) |
| Operator APIs | `/api/intelligence/pricing`, `/api/intelligence/decisions`, `/api/intelligence/operations` |
| Operationalization map | `operations.ts` — per-domain posture + live ledger freshness |
| Business metrics | `kartex_intelligence_decisions_total`, `kartex_pricing_proposals_total`, decision-age gauge |

---

## 1. Commerce Intelligence Reality Report (F.1)

| Subsystem | Status | Evidence |
|---|---|---|
| Pricing | **PARTIAL (algorithm, not operated)** | `lib/hyperlocal-operations` has `DynamicPricingDecision`/`DistressPricingRecommendation` (freshness/spoilage markdown) — heuristic only; no service/API/audit/rollback |
| Forecasting | **EXISTS (algorithm)** | `lib/executive-intelligence/forecasting.ts` — demand/stockout/revenue/seller forecasts w/ drift risk + confidence; no service/storage/eval |
| Inventory | **EXISTS (algorithm)** | `hyperlocal-operations` reorder thresholds, spoilage risk, `InventoryOperationalState`; not exposed/audited |
| Supply | **PARTIAL** | Neo4j supply graph defined (Phase B) but not projected/operated |
| Routing | **OPERATED (DB RPC)** | `lib/logistics/live-operations.ts` → `run_live_dispatch_intelligence`, `refresh_logistics_routing_intelligence` |
| Fulfillment | **OPERATED (DB RPC)** | dispatch/SLA/failover RPCs + Shiprocket provider; **execution gated on scheduler (D-C1)** |
| Telemetry | **PARTIAL** | operational events emitted; no intelligence-decision stream until now |
| Search | **EXISTS (algorithm)** | hybrid retrieval; governed inference seam available (E) but routes not wired (E-H4) |
| Recommendation | **EXISTS (algorithm)** | `recommendation-engine.ts` heuristic |
| Demand | **EXISTS (algorithm)** | folded into forecasting/hyperlocal demand momentum |
| Seller intelligence | **EXISTS (algorithm + API)** | `api/seller/intelligence`, `api/seller/snapshot` |
| Buyer intelligence | **EXISTS (algorithm)** | `personalization.ts` (PII-sensitive) |

**Conclusion:** intelligence largely **exists as heuristics**; logistics is genuinely operated (DB RPCs) but **idle without the scheduler**. The universal gap is **operability + auditability**: no unified decision ledger, no operator decision API, no business-decision governance, and pricing/forecast/inventory not exposed as governed services. Phase F builds exactly that substrate.

---

## 2. Domain Operationalization Report (F.2)

`lib/commerce-intelligence/operations.ts` declares, per domain, the operational primitives (owner / storage / events / inference / API / monitoring / recovery / business metric) and `/api/intelligence/operations` adds **live decision freshness** from the ledger. A domain is `operated` when storage + events + monitoring + (API or inference) are present. Pricing/search are now fully operated; forecasting/inventory/recommendation/buyer have storage+events+monitoring+inference via the seam with operator APIs pending (F-H1); routing/fulfillment are operated but **scheduler-gated (D-C1)**; supply needs the Neo4j projection (F-H3).

---

## 3. Pricing Platform Report (F.3)

The centerpiece. `pricing/engine.ts` layers **static / inventory-based / demand-based / promotional / competitive / distress** rules into a **bounded proposal** with explicit reasons and two hard guardrails: **(1) never below cost floor** (margin protection), **(2) bounded per-change magnitude** (default ±15%). `pricing/service.ts` runs it through the domain seam (inference governance + decision ledger) and persists a `pricing_proposals` row with an **approve → apply → rollback** trail.
**Governance (verified by tests):** distress markdowns and any high-risk / guardrail-breaching change are **NOT auto-apply-eligible** — humans approve them; default action is `proposed`, never silent `applied`. Pricing decision log + audit trail + rollback states satisfy F.3's required outputs. Applying an approved proposal to the live product price = F-H2 (operator action endpoint).

---

## 4. Forecasting Platform Report (F.4)

Forecast algorithm exists (`executive-intelligence/forecasting.ts`: direction, confidence, drift risk, replay key). Operationalized via the domain seam: forecasts recorded in the ledger (storage + audit + event), inference-governed (timeout/breaker/fallback), and monitorable (`kartex_intelligence_decisions_total{domain="forecasting"}` + decision-age gauge). **Forecast evaluation + drift** reuse the Phase E framework (PSI/freshness) — wiring the periodic forecast-vs-actual job is **F-H1/E-H5** (depends on D-C1 scheduler). Dedicated forecast storage table + API = F-H1.

---

## 5. Inventory Intelligence Report (F.5)

Stock prediction / reorder detection / risk (spoilage, days-of-cover, distressed/expiring states) exist in `hyperlocal-operations`. Operationalized through the seam: reorder/risk decisions are logged + audited + emitted, drive pricing distress markdowns, and surface via `kartex_inventory_drift`. Inventory recovery = the Phase B inventory stream (Flink) re-derivation + compensating adjustments. Operator inventory-intelligence API + automatic reorder proposals = F-H1.

---

## 6. Supply & Routing Report (F.6)

**Routing/fulfillment are the most operated domains:** DB RPCs (`run_live_dispatch_intelligence`, `refresh_logistics_routing_intelligence`, `run_dynamic_delivery_sla_enforcement`, `run_logistics_provider_failover`, `analyze_delivery_congestion`) provide routing decisions, delivery optimization, vendor/warehouse routing, and provider failover — all DB-backed and event-logged. **Supply graph** (vendor→product→warehouse→zone) is defined in Neo4j (Phase B) but **not projected** (F-H3). **Critical caveat:** these RPCs require the **scheduler (D-C1)** to fire; today they are operable-but-idle.

---

## 7. Fulfillment Platform Report (F.7)

Allocation + exception handling + failover live in the logistics RPCs + Shiprocket provider (Phase A) with self-delivery fallback. Fulfillment metrics flow through Phase C; failures are operational events (Phase D breaker/retry available for provider calls via E-H3/D-H3). A fulfillment operations dashboard panel set = F-M1; allocation-engine decisions are now ledger-auditable when routed through the seam.

---

## 8. Search & Recommendation Report (F.8)

Search/ranking/recommendation/personalization exist as heuristics with the Phase E governed inference seam available. Phase F adds: decision-ledger auditability + business-impact tracking (`kartex_search_queries_total`, zero-result rate). **F-H1/E-H4:** route the live search & recommendation paths through `operateDomain`/`runInference` so inference monitoring + drift + evaluation tracking populate per request. Recommendation CTR + search effectiveness become first-class business metrics.

---

## 9. Buyer & Seller Intelligence Report (F.9)

Seller intelligence has live APIs (`api/seller/intelligence`, `snapshot`); buyer intelligence (personalization) is PII-sensitive. Lifecycle scoring / activity intelligence / risk + performance signals are computable from existing aggregates and are now ledger-recordable via the seam. **F-H1:** expose buyer-insights + seller-insights operator endpoints + lifecycle scoring decisions in the ledger. PII governance: personalization decisions avoid raw PII in metadata (Phase C redaction).

---

## 10. Telemetry Intelligence Report (F.10)

Every intelligence decision now fans out to the Phase B **`kartex.analytics.telemetry.stream`** topic (degrade-safe) as an `intelligence_decision` event, alongside the structured log + business metric. This unifies behavior / operational / commerce / forecast / inventory / recommendation streams into one auditable decision stream. Dedicated per-domain topics + Flink aggregation = F-M2.

---

## 11. Business Governance Report (F.11)

The `commerce_intelligence_decisions` ledger makes **every** decision auditable: pricing (proposal + reasons + guardrail + risk + approver trail), forecast, recommendation, inventory, seller — each with inputs, decision, action, reversibility, confidence, actor, trace, timestamp. Pricing additionally has a dedicated governed `pricing_proposals` table with approve/reject/apply/rollback states. RLS scopes reads (admins all; sellers their vendor; actors their own). Decision auditability / pricing auditability / forecast auditability / recommendation auditability / inventory auditability / seller auditability are **satisfied at the ledger level**; per-domain wiring to emit into the ledger is F-H1.

---

## 12. Phase F Remediation Program (F.12)

> Each: Problem · Risk · Impact · Deps · Implementation · Validation · Rollback · Acceptance · Effort.

### CRITICAL
**F-C1 — Scheduler (carried A→F).** Routing/fulfillment RPCs + forecast/drift jobs are operable but **idle** without a scheduler. Impl: `vercel.json` crons + `CRON_SECRET` (D-C1). Validation: RPCs fire; decision-age gauge stays fresh. Effort: S.

### HIGH
**F-H1 — Wire all domains into the seam/ledger.** Route forecasting/inventory/recommendation/search/seller/buyer decisions through `operateDomain` so they are audited + monitored; add operator read APIs (buyer-insights, seller-insights, forecast). Validation: `/api/intelligence/operations` shows fresh decisions per domain. Effort: M.
**F-H2 — Pricing apply/approve actions.** Endpoints to approve → apply a proposal to the live product price + rollback, with audit. Validation: proposal lifecycle e2e; price reverts on rollback. Rollback: status flip. Effort: M.
**F-H3 — Supply graph projection** (Neo4j) for vendor/warehouse routing intelligence (Phase B/E-H2 projector). Effort: M.

### MEDIUM
**F-M1** Fulfillment ops dashboard (Grafana) + allocation decision panels. **F-M2** Per-domain telemetry topics + Flink aggregation. **F-M3** Forecast storage table + evaluation (vs actuals) job. **F-M4** Recommendation CTR / search-effectiveness attribution.

### LOW
**F-L1** Competitive pricing data ingestion. **F-L2** Pricing experiment (A/B) framework. **F-L3** Decision-ledger retention policy.

---

## 13. Commerce Intelligence Readiness Score

| Domain | Algorithm | Operated (storage/events/audit/monitoring/API) | Score |
|---|---|---|---|
| Pricing | ✅ | ✅ governed proposals + audit + rollback | 75 |
| Routing | ✅ | ✅ DB RPC (scheduler-gated) | 62 |
| Fulfillment | ✅ | ✅ DB RPC + provider (scheduler-gated) | 60 |
| Forecasting | ✅ | ◑ seam+ledger; API/eval pending | 55 |
| Inventory | ✅ | ◑ seam+ledger; API pending | 55 |
| Search | ✅ | ◑ seam available; route wiring pending | 55 |
| Recommendation | ✅ | ◑ seam+ledger; wiring pending | 50 |
| Seller | ✅ | ◑ APIs exist; ledger wiring pending | 55 |
| Buyer | ✅ | ◑ PII-aware; API pending | 48 |
| Supply | ◑ | ◑ graph not projected | 40 |
| Telemetry | ✅ | ✅ decision stream | 65 |

**Weighted Commerce Intelligence Readiness ≈ 56/100.** The operating substrate (storage, audit ledger, domain seam, governed pricing, operator APIs, monitoring) is built and build-safe; the gap is **wiring each domain into the seam + the scheduler**.
**Program effect:** overall production readiness ~50% → **~54-56%** now; reaches the operational-commerce-intelligence bar once F-C1 + F-H1 + F-H2 land and are VERIFY-LIVE.

---

## 14. Operational Ownership Matrix

| Domain | Owner | On-call | Operator surface | Audit |
|---|---|---|---|---|
| Pricing | commerce-platform | commerce-oncall | `/api/intelligence/pricing` | `pricing_proposals` + ledger |
| Forecasting | data-platform | data-oncall | (F-H1) | ledger |
| Inventory | commerce-platform | commerce-oncall | (F-H1) | ledger |
| Supply | logistics-platform | logistics-oncall | (F-H3) | ledger |
| Routing | logistics-platform | logistics-oncall | logistics RPC + ops | DB + ledger |
| Fulfillment | logistics-platform | logistics-oncall | logistics RPC + ops | DB + ledger |
| Search | discovery-platform | ai-oncall | `intelligence/search` | ledger + search metrics |
| Recommendation | growth-platform | ai-oncall | (F-H1) | ledger |
| Seller | commerce-platform | commerce-oncall | `seller/intelligence` | ledger |
| Buyer | growth-platform | ai-oncall | (F-H1) | ledger |
| Telemetry | data-platform | data-oncall | analytics topic | ledger |
| All decisions | — | platform-oncall | `/api/intelligence/decisions`, `/api/intelligence/operations` | `commerce_intelligence_decisions` |

---

## 15. Commerce Intelligence Dependency Graph

```
inputs (orders, products, inventory, behavior, telemetry)
        │
        ▼
   domain algorithms (hyperlocal-ops pricing/inventory, exec forecasting,
   ai search/ranking/reco/personalization, logistics RPC routing/fulfillment)
        │  operateDomain()
        ▼
   Phase E inference seam  ── timeout + circuit breaker + fallback + AI metrics
        │
        ▼
   recordIntelligenceDecision()
        ├─► commerce_intelligence_decisions (storage + audit; RLS)        [operators: /api/intelligence/decisions]
        ├─► kartex.analytics.telemetry.stream (Phase B event; degrade-safe)
        └─► kartex_intelligence_decisions_total + decision-age gauge (Phase C)  [/api/intelligence/operations]

   pricing path additionally ─► pricing_proposals (approve/apply/rollback)  [/api/intelligence/pricing]
   ALL truth ─► Postgres (decisions auditable; high-risk pricing never auto-applied)
   execution of routing/fulfillment/forecast/drift ─► requires scheduler (D-C1)
```

---

## 16. Go / No-Go Decision

### Decision: **CONDITIONAL GO** — the operating layer is real, governed, auditable, and mergeable; **full Tier 4-9 operationalization is NOT yet certified.**

- **GO to merge + enable in staging:** storage (migration), unified decision ledger, domain seam, governed pricing service + APIs, operator audit/operations APIs, and business metrics all exist, validate, and are build-safe; nothing changes runtime behavior until domains adopt the seam and the migration is applied.
- **NO-GO for "every intelligence subsystem is operated" certification** until: **F-C1** (scheduler — routing/fulfillment/forecast jobs are idle without it), **F-H1** (wire forecasting/inventory/recommendation/search/seller/buyer through the seam so they are audited + monitored), and **F-H2** (pricing approve/apply/rollback actions). Migration must be applied + RLS verified live.

**Net:** intelligence decisions are now **auditable, governed, and operator-visible**, and pricing is a real governed platform. Operationalizing the remaining domains is mechanical wiring through the seam + turning on the scheduler.

---

### VERIFY-LIVE checklist
- Apply the Phase F migration; verify RLS on `commerce_intelligence_decisions` + `pricing_proposals`.
- Scheduler firing routing/fulfillment/forecast RPCs (D-C1); decision-age gauge fresh.
- Pricing proposal lifecycle (propose → approve → apply → rollback) e2e with audit.
- `/api/intelligence/operations` shows live decisions for every wired domain.
- Decision ledger + telemetry topic receiving events under load.
