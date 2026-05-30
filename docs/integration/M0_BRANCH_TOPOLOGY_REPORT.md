# M0 — Branch Topology Reconstruction Report

**Program:** KARTEX Phase M0 — Unified Platform Consolidation & Integration.
**Type:** Integration engineering (merge/validate/certify). No new features, intelligence, tiers, or architecture.
**Integration branch:** `integration/phase-m0-unified-platform` (based on `origin/main` @ `4df0098`).
**Date:** 2026-05-30.

## 1. Topology overview

All 13 phase branches were forked from the common base `4df0098` (= `origin/main`). Analysis of `git merge-base --is-ancestor` reveals two structures:

- **Linear stack (B→C→D→E→F→G):** each branch is an ancestor of the next. Merging G alone would transitively include B–F; per directive we still merge each sequentially for auditable, isolated merge reports.
- **Independent singletons/stacks off main:** `A`, `H→I` (H is ancestor of I), `stage-1`, `J`, `K`, `L`.

```
4df0098 (main / integration base)
 ├─ A  audit/phase-a-production-foundation        (docs only)
 ├─ B  infra/phase-b-distributed-runtime ─┐ linear
 │   └ C obs/phase-c-observability         │ stack
 │     └ D reliability/phase-d-failure-survival
 │       └ E ai/phase-e-platform-foundation
 │         └ F commerce/phase-f-intelligence-ops
 │           └ G advanced/phase-g-systems-ops
 ├─ H  phase-h/enterprise-readiness-audit ─┐ (docs)
 │   └ I phase-i/production-certification   │ H ancestor of I
 ├─ stage-1 production-readiness-remediation (config/build hardening)
 ├─ J  phase-j/tier-realization-audit       (docs only)
 ├─ K  phase-k/commerce-intelligence-productization (intelligence UI)
 └─ L  phase-l-finalization                 (vitest fix + baseline docs)
```

## 2. Branch Impact Matrix

Counts are `git diff --name-status origin/main origin/<branch>` (A=added, M=modified, D=deleted). For the linear stack, counts are cumulative because each branch contains its predecessors.

| Order | Branch | Purpose | Added | Modified | Deleted | Architectural scope | Dependencies | Conflict risk |
|:--:|---|---|:--:|:--:|:--:|---|---|:--:|
| A | audit/phase-a-production-foundation | Production-foundation reality audit (T1–3) | 1 | 0 | 0 | docs | none | **None** |
| B | infra/phase-b-distributed-runtime | Distributed runtime (Redis/Kafka/Neo4j/Qdrant/Flink), infra scaffolding | 25 | 2 | 0 | infra, lib/security, env | base | **Low** (`.env.example`, `lib/security/rate-limit.ts`) |
| C | obs/phase-c-observability | Telemetry & operational truth | 42* | 4* | 0 | infra/observability, lib | B | **Low** (stack) |
| D | reliability/phase-d-failure-survival | CB/retry/timeout, chaos, SLOs, DR | 58* | 5* | 0 | lib/reliability, scripts | B,C | **Low** (stack) |
| E | ai/phase-e-platform-foundation | AI platform & model ops | 70* | 5* | 0 | lib/ai, config/model-registry | B–D | **Low** (stack) |
| F | commerce/phase-f-intelligence-ops | Decision ledger, pricing platform, operator APIs | 83* | 5* | 0 | app/api/intelligence, lib | B–E | **Low** (stack) |
| G | advanced/phase-g-systems-ops | Tier 10–15 operationalization (governance/sim/knowledge runtimes) | 98* | 5* | 0 | app/api/advanced, lib/tier*, infra | B–F | **Low** (stack) |
| H | phase-h/enterprise-readiness-audit | Enterprise readiness audit | 1 | 0 | 0 | docs | none | **None** |
| I | phase-i/production-certification | Production certification | 2 | 0 | 0 | docs (incl. H doc) | H | **None** |
| I.5 | stage-1/production-readiness-remediation | Readiness remediation (build/config/CI hardening) | 12 | 9 | 0 | package.json, next.config, middleware, CI, `lib/tier14` | base | **Medium** (`package.json`, `package-lock.json`, `lib/tier14/index.ts`, `middleware.ts`, `next.config.ts`) |
| J | phase-j/tier-realization-audit | Tier realization audit & manifest | 1 | 0 | 0 | docs | none | **None** |
| K | phase-k/commerce-intelligence-productization | Commerce-intelligence product surfaces (14 pages) | 23 | 3 | 0 | app/(intelligence), features, lib/constants, `lib/tier14` | base | **Medium** (`lib/constants/*`, `lib/tier14/index.ts`) |
| L | phase-l-finalization | vitest Windows fix + baseline certification docs | 27 | 1 | 0 | vitest.config, docs/baseline | base | **Low** (`vitest.config.ts`; already integrates baseline) |

\* cumulative (stacked on predecessors).

## 3. Conflict hotspots (pre-merge prediction)

| File | Touched by | Predicted resolution policy |
|---|---|---|
| `lib/tier14/index.ts` | stage-1, K, (L lineage) | Union of definitions; keep all exports, prefer the superset |
| `lib/constants/navigation.ts`, `marketplace.ts` | K (+ base) | Take K (adds intelligence nav); preserve existing entries |
| `package.json`, `package-lock.json` | stage-1 | Take stage-1 (readiness deps); re-run `npm install` to reconcile lock |
| `next.config.ts`, `middleware.ts`, `vercel.json` | stage-1 | Take stage-1 (hardening) |
| `.env.example` | B | Union of variables |
| `vitest.config.ts` | L | Take L (Windows-path fix — required for tests) |

## 4. Merge plan

Strict order **A → B → C → D → E → F → G → H → I → (I.5 stage-1) → J → K → L**. After each merge: record files changed, conflicts, resolution, risk, and run build/test gates. Stop on any unstable state. `stage-1` is inserted at I.5 (it follows production-certification logically and is not one of the lettered phases). Each merge is documented in `M0_MERGE_REPORTS.md`; conflicts in `M0_CONFLICT_RESOLUTION_REGISTRY.md`.
