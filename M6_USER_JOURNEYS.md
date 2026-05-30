# M6.9 — Intelligence Journeys Report

Phase: KARTEX M6 — Cross-System Intelligence Integration Platform

All three mandatory journeys function across systems from a single experience.

## Journey A — Research → Publish → Knowledge → Simulation → SECIS → Governance

1. **Create** an intelligence workflow in the Workflow Center
   (`/intelligence/workflows` → "New workflow"). It starts at the **Research**
   stage with a canonical research node and a provenance "created" event.
2. **Advance** the workflow stage by stage ("Advance" button). Each advance marks
   the current stage complete, creates the next stage's canonical node, and
   records provenance — moving Research → Knowledge → Simulation → SECIS →
   Governance.
3. At the **Simulation/SECIS/Governance** stages, each stage card links straight
   into that operating system ("Open in Simulation/SECIS/Governance") so the
   actual work happens there, while lineage and provenance are tracked centrally.
4. The seeded **Festive Pricing** and **Dairy Supply** workflows show a fully
   completed end-to-end chain with real links to `sim_pricing` /
   `dec-pricing` and `ce-supplier` / `dec-backup`.

## Journey B — Search Knowledge → Launch Simulation → Analyze Impact → Approve

1. **Search** across all systems in Cross-System Search (`/intelligence/search`),
   filtering by system/status — find a knowledge asset or simulation.
2. **Launch a simulation** by following the result (or a workflow's simulation
   stage) into the Simulation OS.
3. **Analyze impact** by moving to the SECIS stage / opening SECIS.
4. **Approve** the resulting decision in the Governance OS. The Q3 Launch
   Readiness workflow demonstrates this with `sim_launch` complete and the SECIS
   stage in progress toward governance approval.

## Journey C — Governance Decision → Simulation source → Knowledge source → Research source

1. **Open** a governed decision, e.g. "Adopt optimised festive price"
   (`/governance/decisions/dec-pricing`).
2. From the platform, open the **Festive Pricing Initiative** workflow's Lineage
   Center (`/intelligence/lineage?workflow=wf-pricing`).
3. **Trace back** through the lineage graph: governance ← SECIS ← **simulation
   (`sim_pricing`)** ← **knowledge (elasticity playbook)** ← **research
   (elasticity study)** — each node clickable into its system.
4. The Provenance System (`/intelligence/provenance?workflow=wf-pricing`) shows
   who researched, published, executed, analyzed, and governed — across systems.

## Verification

- `next build` compiles all intelligence routes alongside the five systems.
- `tests/unit/intelligence-platform.test.ts` validates the canonical lifecycle,
  workflow progress, lineage columns, and RBAC.
- Seeded workflows reference real M3/M4/M5 items, so every journey traverses real
  cross-system links.
