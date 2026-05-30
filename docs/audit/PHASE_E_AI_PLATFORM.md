# KARTEX / VendorHub — Phase E AI Platform Foundation Certification

**Objective:** Transform AI from experiments into **governed production infrastructure** — every model tracked, explained, versioned, evaluated, monitored, and rollback-capable.
**Method:** AI reality audit → implement the operating system (registry, inference seam, drift detection, AI observability, governance gates) → validate → certify.
**Safety invariant (enforced):** the platform is additive and build-safe; inference degrades to fallbacks (never throws when a fallback exists); governance is a gate, not a runtime dependency.

> Authoring-time verification: `tsc --noEmit` exit 0 · `vitest run` **222/222** (37 files; +11 AI tests) · `eslint` clean · `ops:model-registry-audit --enforce` exit 0 (0 governance violations) · AI YAML/JSON parse.
> **Stacked on PR #4 (Phase D)** — inference uses Phase D primitives; AI metrics extend Phase C.

---

## What was delivered

| Capability | Implemented | Where |
|---|---|---|
| Model registry + governance | typed catalog, lifecycle states, governance validator | `config/model-registry.json`, `lib/ai-platform/registry.ts` |
| Governance gate (CI) | no production model without owner+eval+version+lineage+risk | `scripts/ops-model-registry-audit.mjs` |
| Inference platform | timeout + circuit breaker + fault-injection + fallback + metrics | `lib/ai-platform/inference.ts` |
| Drift detection | PSI, freshness, embedding-centroid drift | `lib/ai-platform/drift.ts` |
| AI observability | inference latency/error/fallback/score/drift metrics + dashboard | `lib/observability/metrics.ts`, `infra/observability/grafana/dashboards/ai-platform.json` |
| AI health + consistency | registry posture + embedding-dim consistency check | `app/api/ai/health/route.ts` |
| AI alerts | error/latency/fallback/drift rules | `infra/observability/ai.rules.yml` |

---

# 1. AI Foundation Reality Report (E.1)

**Decisive finding:** KARTEX has **no trained model artifacts, no training jobs, no model registry, and no evaluation framework.** Its "AI" is **deterministic/heuristic algorithms** plus an **embedding provider**.

| Subsystem | Status | Evidence |
|---|---|---|
| Embeddings | **PARTIAL (provider + risky fallback)** | `lib/ai/openai-embeddings.ts` (text-embedding-3-small, 1536d) → **hash-based deterministic fallback** `local-embeddings.ts` when no `OPENAI_API_KEY` |
| Semantic search | **EXISTS (heuristic)** | `searchLiveMarketplaceProducts` hybrid retrieval (embedding + FTS + fuzzy) |
| Ranking | **EXISTS (heuristic)** | `ranking-intelligence.ts` — adaptive weights + internal `driftScore` |
| Recommendations | **EXISTS (heuristic)** | `recommendation-engine.ts` — diversity/freshness scoring |
| Personalization | **EXISTS (heuristic)** | `personalization.ts` — drift/recalibration flags |
| Forecasting | **PARTIAL** | `executive-intelligence/forecasting.ts` (statistical heuristic) |
| Pricing intelligence | **PROTOTYPE** | heuristic, not wired to auto-apply |
| Inventory intelligence | **EXISTS (heuristic)** | merchant intelligence signals |
| Knowledge retrieval (RAG) | **PROTOTYPE** | Qdrant `knowledge_chunks_v1` defined (Phase B); pipeline not wired |
| Vector pipelines | **PARTIAL** | pgvector live; Qdrant defined but model/dim mismatch |
| Training jobs | **MISSING** | none |
| Evaluation jobs | **MISSING** | `search_quality_score` column exists; no eval harness |
| Inference services | **PARTIAL** | API routes call heuristics directly; no governed inference seam (now added) |
| Feature pipelines | **PARTIAL** | features derived ad hoc from Postgres; no catalog |

**Two real correctness bugs surfaced:**
1. **Embedding model/dimension mismatch** — app uses `text-embedding-3-small` (1536d); Phase B `infra/qdrant/collections.json` declared `bge-small-en-v1.5` (384d). The Qdrant collections as defined cannot hold the app's vectors. (`/api/ai/health` now reports this.)
2. **No model-version isolation in the index** — OpenAI vectors and hash-fallback vectors are written to the same store; they are **not comparable**, so a fallback episode silently corrupts similarity quality.

---

# 2. Model Registry Catalog (E.2)

`config/model-registry.json` — **10 governed assets**, each with name/purpose/owner/IO schema/training source/eval metrics/version/state/risk/business impact/lineage. Summary:

| Model | Owner | State | Risk | Type |
|---|---|---|---|---|
| commerce-embedding | discovery-platform | production | high | embedding |
| semantic-search | discovery-platform | production | high | retrieval-ranking |
| hybrid-ranking | discovery-platform | production | high | ranking |
| recommendation-engine | growth-platform | production | medium | recommendation |
| personalization-profile | growth-platform | production | medium | personalization |
| inventory-intelligence | commerce-platform | production | medium | operational |
| feedback-learning | discovery-platform | production | medium | online-adaptation |
| demand-forecasting | data-platform | staging | medium | forecasting |
| knowledge-retrieval | knowledge-platform | development | low | retrieval |
| pricing-intelligence | commerce-platform | development | high | pricing |

**No orphan intelligence:** every asset has an owner (validated). **7 production / 1 staging / 2 development.**

---

# 3. Model Registry Report (E.3)

`lib/ai-platform/registry.ts` implements: **versioning**, metadata, lifecycle **states** (development→candidate→staging→production→retired), **promotion/rollback transitions** (`canTransition` — e.g. `development→production` is rejected; `production→staging` allowed as rollback/hold), lineage, and **governance validation**. The CI gate `ops:model-registry-audit --enforce` blocks any production asset missing owner/eval/version/lineage/risk — it already **caught an invalid `prototype` state during authoring** (fixed to `development`). **No model may reach production without registration.** Approval/artifact-store integration = remediation E-H1.

---

# 4. Training Certification Report (E.4)

**Reality:** there are **no training pipelines** — assets are rule-based; embeddings come from a pretrained provider. So "training certification" today = **provenance + reproducibility contracts**:
- Each registry entry declares `trainingSource` (none/rule-based, behavioral telemetry, ingested docs, or provider-pretrained).
- Reproducibility for deterministic models is inherent (same input → same output; ranking declares `replaySeed`/`deterministicTieBreak`).
**Gaps:** no dataset versioning, no training metadata/artifact store, no execution tracking — because there is nothing trained yet. When a trained model is introduced (e.g. a real embedding model or a learned ranker), the registry already reserves `trainingSource` + `version` + `lineage` to capture it. **Remediation E-H2** defines the training-pipeline contract to adopt before any trained model ships.

---

# 5. Model Evaluation Report (E.5)

**Reality:** **0 of 7 production models have `lastEvaluatedAt`** (surfaced by `registrySummary().unevaluatedProduction`). Quality signals exist (`search_quality_score`, internal `driftScore`, zero-result rate via Phase C `kartex_search_zero_results_total`) but there is **no offline/online evaluation harness, no A/B, no shadow eval, no regression gate**.
**Delivered now:** evaluation **metric contracts per model** in the registry (e.g. `ndcg@10`, `recommendation_ctr`, `mape`, `retrieval_recall@k`, `zero_result_rate`) + the metrics to measure them online (Phase C/E). **Remediation E-C2 (CRITICAL):** stand up an offline eval harness on golden sets + a regression gate so `lastEvaluatedAt` is populated and "no production model without measurable quality" becomes true.

---

# 6. Feature Platform Report (E.6)

**Reality:** features are derived ad hoc inside each heuristic from Postgres (product attributes, embedding freshness `embedding_updated_at`, behavioral events). **No feature catalog/ownership/freshness monitoring/lineage.**
**Delivered:** registry `lineage.consumes` documents each model's feature inputs; **freshness drift** (`freshnessDrift`) monitors embedding/profile/snapshot staleness. **Remediation E-H3:** formal `config/feature-catalog.json` with owner + validation + freshness SLO + lineage (the registry lineage is the seed).

---

# 7. Inference Platform Report (E.7)

`lib/ai-platform/inference.ts` — **one governed seam** for every model call:
- **Latency target + timeout** (`INFERENCE_LATENCY_TARGETS_MS`, Phase D `withTimeout`) — a slow model can't exhaust the request.
- **Circuit breaker** (Phase D) per model — a failing model fails fast.
- **Fault-injection hook** (Phase D) — inference degradation is testable.
- **Fallback** — inference **never throws** when a fallback is provided (graceful degradation = operational event, logged).
- **Caching/scaling**: caching via existing Phase A/C cache layer + Redis (Phase B) per inference contract; scaling is platform-managed (serverless).
- **Metrics** (Phase C/E): latency, error, fallback, prediction score.
**Verified by tests:** success path, fallback-on-failure, and timeout-budget→fallback all pass. **Remediation E-H4:** wire existing search/recommendation/ranking routes through `runInference` (currently they call heuristics directly).

---

# 8. Drift Detection Report (E.8)

`lib/ai-platform/drift.ts` (dependency-free, tested):
| Drift kind | Method | Status thresholds |
|---|---|---|
| Data / feature / prediction drift | **PSI** over binned distributions | warn ≥0.1, drift ≥0.25 |
| Embedding drift | cosine distance of centroids | warn ≥0.05, drift ≥0.15 |
| Freshness drift (concept proxy) | artifact age vs max | warn ≥75% of max, drift > max |
Status (0/1/2) mirrors to `kartex_ai_drift_status{model,kind}` → alertable (`ai.rules.yml`). Detects distribution changes, quality changes, accuracy degradation (via prediction-score gauge), freshness degradation. **Remediation E-H5:** schedule periodic drift computation jobs (baseline snapshots vs live) per model.

---

# 9. AI Observability Report (E.9)

Per-model signals now exposed (Phase C/E metrics + `/api/ai/health` + Grafana **AI Platform** dashboard):
| Signal | Metric |
|---|---|
| Latency | `kartex_ai_inference_duration_seconds` |
| Throughput | `kartex_ai_inference_requests_total` |
| Error rate | `kartex_ai_inference_errors_total` |
| Fallback rate | `kartex_ai_inference_fallback_total` |
| Prediction/confidence distribution | `kartex_ai_prediction_score` |
| Drift status | `kartex_ai_drift_status` |
| Version / owner / state | `/api/ai/health` registry + `kartex_ai_model_info` |
Resource usage = platform (serverless) metrics. **VERIFY-LIVE:** dashboards populate once routes call `runInference` (E-H4).

---

# 10. AI Deployment Report (E.10)

**Governance via the registry lifecycle:** development→candidate→staging→production→retired with validated transitions and rollback (`production→staging`). Deployment strategies:
- **Canary / shadow / blue-green:** the inference seam supports **shadow/canary routing** (run a candidate model alongside production and compare outputs/metrics) — the hook is the per-model breaker + metrics by `model` label; candidate keys (e.g. `hybrid-ranking@candidate`) emit parallel metrics. **Routing wiring = E-H1.**
- **Rollback:** flip registry state to `staging` + route traffic back (instant, config-driven); ties to Phase D rollback-plan (provider/feature-flag surfaces).
- **Approval/promotion workflow:** governance gate must pass before `production`. **VERIFY-LIVE:** run a shadow→canary→promote→rollback drill (E-H1).

---

# 11. AI Safety Report (E.11)

| Risk | Posture |
|---|---|
| Prompt injection | **Low today** — no LLM/prompt execution path; search input is Zod-validated + rate-limited. Re-assess if an LLM is added. |
| Model abuse / scraping | AI search is rate-limited (`securityRateLimits.aiSearch`) + auth-aware |
| Data leakage | structured logs **redact** secrets/PII (Phase C `core.ts`); inference metadata avoids raw PII |
| PII exposure | personalization is PII-sensitive (flagged risk); profiles keyed by anon/buyer id, not raw PII |
| Embedding leakage | embeddings are derived; **/api/ai/health doesn't expose vectors**; remediation: ensure vector store auth (Qdrant api-key, Phase B) + no public embedding endpoint |
| Unauthorized access | inference behind app auth; `/api/ai/health` should be protected (E-M2) |
| Model tampering | registry is version-controlled config; governance gate detects unregistered/invalid entries |

**Remediation E-H6:** add input guards for any future LLM path (prompt-injection filters) + protect `/api/ai/health` + enforce vector-store auth in all environments.

---

# 12. Phase E Remediation Program (E.12)

> Each: Problem · Risk · Impact · Deps · Implementation · Validation · Rollback · Acceptance · Effort.

### CRITICAL
**E-C1 — Fix embedding model/dimension mismatch + provider isolation.** Risk: corrupted similarity, broken Qdrant integration. Impl: choose one model per collection; set Qdrant collection dim to match (1536 for text-embedding-3-small) OR adopt bge-small (384) consistently; **never mix providers in one index** (suffix `_openai` / `_local`, or disable Qdrant writes when on fallback). Validation: `/api/ai/health` embeddingConsistency ok; recall sanity check. Rollback: keep pgvector path. Acceptance: single comparable vector space per collection. Effort: M.
**E-C2 — Stand up the evaluation harness + regression gate.** Risk: production intelligence with no measurable quality (7/7 unevaluated). Impl: golden-set offline eval (ndcg@10/zero-result/recall) per model; populate `lastEvaluatedAt`; gate promotion. Validation: eval job runs in CI; metrics recorded. Effort: M–L.

### HIGH
**E-H1 — Promotion/approval + shadow/canary routing** through the inference seam (candidate vs production metrics). Effort: M.
**E-H2 — Training-pipeline contract** (dataset version, metadata, artifact store, execution tracking) — adopt before any trained model ships. Effort: M.
**E-H3 — Feature catalog** (`config/feature-catalog.json`: owner, validation, freshness SLO, lineage). Effort: M.
**E-H4 — Route inference through `runInference`** (search/recommendation/ranking/forecasting) to activate AI metrics + breakers + fallbacks. Effort: M.
**E-H5 — Scheduled drift jobs** (baseline vs live PSI/centroid/freshness) emitting `kartex_ai_drift_status`. Deps: D-C1 scheduler. Effort: M.
**E-H6 — AI safety hardening** (protect `/api/ai/health`, enforce vector-store auth, prompt-injection guards for future LLM). Effort: S–M.

### MEDIUM
**E-M1** Embedding refresh worker → Qdrant upsert (ties Phase B embedding pipeline). **E-M2** Authn on AI health/metrics. **E-M3** Knowledge-retrieval (RAG) pipeline wiring. **E-M4** A/B experiment framework on ranking weights.

### LOW
**E-L1** Model cards (human-readable) generated from the registry. **E-L2** Lineage graph visualization. **E-L3** Confidence calibration tracking.

---

# 13. AI Readiness Score

| Dimension | Score | Notes |
|---|---|---|
| Registry / governance | 78 | catalog + states + validated transitions + CI gate |
| Inference platform | 70 | governed seam (timeout/breaker/fallback/metrics); route wiring pending (E-H4) |
| Drift detection | 68 | PSI/freshness/embedding implemented + tested; scheduling pending (E-H5) |
| AI observability | 66 | metrics + dashboard + health; populate via E-H4 |
| Evaluation | 35 | contracts defined; **0/7 prod evaluated** (E-C2) |
| Training | 30 | none exists; contract reserved (E-H2) |
| Feature platform | 45 | lineage seeded; catalog pending (E-H3) |
| Deployment governance | 60 | lifecycle + rollback; shadow/canary routing pending (E-H1) |
| AI safety | 62 | low prompt risk, redaction, rate-limit; hardening pending (E-H6) |

**Weighted AI Readiness ≈ 58/100.** AI is now **governable** (tracked, versioned, owned, monitored, rollback-capable); the gaps are **evaluation** and **wiring inference + the embedding correctness fix**.
**Program effect:** moves overall production readiness from **~45% toward ~50–52%** now; the **operational-intelligence** bar is met once E-C1 + E-C2 + E-H4 land and are VERIFY-LIVE.

---

# 14. Model Ownership Matrix

| Model | Owner | On-call | Risk | State | Eval owner |
|---|---|---|---|---|---|
| commerce-embedding | discovery-platform | ai-oncall | high | production | discovery |
| semantic-search | discovery-platform | ai-oncall | high | production | discovery |
| hybrid-ranking | discovery-platform | ai-oncall | high | production | discovery |
| recommendation-engine | growth-platform | ai-oncall | medium | production | growth |
| personalization-profile | growth-platform | ai-oncall | medium | production | growth |
| inventory-intelligence | commerce-platform | commerce-oncall | medium | production | commerce |
| feedback-learning | discovery-platform | ai-oncall | medium | production | discovery |
| demand-forecasting | data-platform | data-oncall | medium | staging | data |
| knowledge-retrieval | knowledge-platform | ai-oncall | low | development | knowledge |
| pricing-intelligence | commerce-platform | commerce-oncall | high | development | commerce |

---

# 15. Intelligence Dependency Graph

```
behavior_events ─► personalization-profile ─┐
                                             ├─► hybrid-ranking ─► search results
products ─► commerce-embedding ─► product_embeddings ─► semantic-search ─┘
   │             │  (openai 1536d OR hash-fallback — E-C1 mismatch w/ Qdrant 384d)
   │             └─► qdrant:product_catalog_v1 (Phase B; dim mismatch)
   ├─► recommendation-engine ◄─ personalization-profile
   ├─► inventory-intelligence ◄─ orders
   └─► pricing-intelligence (dev)
interaction telemetry ─► feedback-learning ─► (recommendation-engine, hybrid-ranking)
analytics aggregates ─► demand-forecasting (staging)
docs ─► commerce-embedding ─► qdrant:knowledge_chunks_v1 ─► knowledge-retrieval (dev)

ALL inference ─► runInference seam ─► [timeout + circuit breaker + fallback + AI metrics]
ALL truth     ─► Postgres (vectors/graph are derived, rebuildable)
```

---

# 16. Go / No-Go Decision

## Decision: **CONDITIONAL GO** — AI is now a governed, observable, rollback-capable asset class; **production-grade operational intelligence is NOT yet certified.**

- **GO to merge + enable in staging:** registry + governance gate + inference seam + drift detection + AI observability all exist, validate, and are build-safe; nothing changes runtime behavior until routes adopt `runInference`.
- **NO-GO for "models are governed production assets" certification** until: **E-C1** (embedding model/dimension + provider isolation — a real correctness bug), **E-C2** (evaluation harness — 0/7 production models are evaluated), and **E-H4** (route inference through the governed seam so AI metrics/drift/breakers are live). Deployment shadow/canary drill (E-H1) and scheduled drift (E-H5, depends on the D-C1 scheduler) follow.

**Net:** KARTEX AI can now be **tracked, explained, versioned, monitored, and rolled back**. It is not yet **evaluated** or **wired through the governed seam** — those are the certification blockers.

---

### VERIFY-LIVE checklist
- Embedding space consistent (single model/dim per collection; no provider mixing) — `/api/ai/health` ok.
- Offline eval harness populates `lastEvaluatedAt` for all production models; regression gate active.
- Search/recommendation/ranking routed through `runInference`; AI dashboards populate.
- Scheduled drift jobs emit `kartex_ai_drift_status`; drift alerts fire/resolve.
- Shadow→canary→promote→rollback drill on a model.
