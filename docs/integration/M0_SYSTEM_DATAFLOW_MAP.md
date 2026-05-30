# M0 — System Dataflow Map (Section 8)

Certifies the layered dataflow after integration. Evidence: merged `lib/`, `app/api/`, `infra/` (B/G), `config/`. **Important reality:** infra services (Kafka/Redis/Neo4j/Qdrant/Flink) are merged as **configuration + client scaffolding**, not running brokers in this certification environment.

## 8.1 Layer connectivity

| Hop | Mechanism (in repo) | State | Notes |
|---|---|:--:|---|
| **UI → API** | Next.js route handlers under `app/api/*` consumed by pages/components | ✅ Connected | 48 API routes; intelligence pages call intelligence/seller APIs |
| **API → Service** | `lib/*` domain modules (commerce, logistics, payments, ai, advanced-intelligence) | ✅ Connected | service functions imported by routes |
| **Service → Database** | Supabase client (`lib/supabase`), 47 migrations | ✅ Wired / ⚠️ env-gated | needs `NEXT_PUBLIC_SUPABASE_*` at runtime |
| **Service → Kafka** | `infra/kafka/topics.json`, schemas, `register-topics.sh`; producer scaffolding | ⚙️ Config-only | no broker in cert env; defined via Phase B |
| **Service → Redis** | runtime config (Phase B), rate-limit/cache libs | ⚙️ Config-only | client scaffolding; no server in cert env |
| **Service → Neo4j** | `infra/neo4j/init/01-constraints.cypher`, tier8/10/11/15 cypher | ⚙️ Config + schema | knowledge graph schema present; not live |
| **Service → Qdrant** | `infra/qdrant/collections.json`, `register-collections.sh`; embeddings lib | ⚙️ Config-only | vector store defined; embeddings API present |
| **Service → Flink** | `infra/flink/jobs/inventory-availability.sql` | ⚙️ Job-defined | stream job SQL present; not running |

## 8.2 Verified live (cert runtime, demo-safe)
- `/api/health` → 200 (liveness).
- `/api/runtime/health` → 200 (Phase B runtime health introspection).
- `/api/ai/health` → 200 (Phase E AI platform health).
- `/api/metrics` → 200 (Phase C observability).
- `/api/readiness` → 503 **by design** — reports `demo-safe`/`degraded` with full dependency check list (Supabase/Razorpay/VAPID not configured). Structured contract, not a break.

## 8.3 Broken connections / dead endpoints / unreachable systems
| Class | Finding |
|---|---|
| **Broken connections** | None at code level — all API routes resolve to service modules and compile. |
| **Missing providers (runtime)** | Supabase, Razorpay, VAPID, Sentry env vars absent in cert env (expected). Kafka/Redis/Neo4j/Qdrant/Flink brokers not provisioned (config-only by design). |
| **Dead endpoints** | None — every route returns a structured response (200 or a deliberate gated error/503). |
| **Unreachable systems (UI)** | Advanced tiers T10–T15 reachable via API only (no page). Knowledge/Research/Simulation/SECIS engines have backend/config but **no UI consumer**. |

## 8.4 Verdict
> **Dataflow CERTIFIED at the code/integration layer:** UI→API→Service→DB paths are continuous and compile; runtime health/metrics/AI endpoints respond. Infra streaming/graph/vector layers are **integrated as configuration** (Phase B/G intent) and require a provisioned environment to exercise end-to-end — a deployment/env task, not an integration defect.
