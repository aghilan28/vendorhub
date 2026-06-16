# M5.13 — Integration Report

Phase: KARTEX M5 — Governance Operating System

M5 is not an isolated subsystem. The Governance OS is designed so that the major
actions of the Research (M1), Knowledge (M2), Simulation (M3), and SECIS (M4)
systems are **governable** from one place.

## Integration model

Every governed object carries a **source system** so its origin is explicit:

```
SourceSystem = research | knowledge | simulation | secis | marketplace | internal
```

- **Decisions** record the `sourceSystem` and a `sourceRef` pointing back to the
  originating item (e.g. `simulation:sim_pricing`, `secis:ce-supplier`,
  `knowledge:demand-forecast`). The Decision Center can be deep-linked with
  `?source=<system>` to raise a governed decision directly from any OS.
- **Policies** declare `appliesToSystems`, so a policy (e.g. "Model Use &
  Automated Decisions") automatically governs Simulation, SECIS, and Research
  actions. The decision-evaluation engine surfaces the applicable published
  policies and mandatory rules for any decision based on its source system.
- **Risks** reference related policies and originate from cross-system analysis
  (the seeded "Single-supplier dependency" risk is sourced from SECIS change-
  impact analysis; "Model drift" from the Simulation/Model domain).

## How each system becomes governable

| System | Governable action | Governance hook |
| --- | --- | --- |
| Research (M1) | Promoting a research finding | Raise a `policy_change`/`strategic` decision with `sourceSystem=research`; "Model Use" policy applies. |
| Knowledge (M2) | Publishing knowledge to production | Decision with `sourceSystem=knowledge` (seeded: "Publish demand-forecast model"); requires review + approval. |
| Simulation (M3) | Adopting a simulation outcome | Decision with `sourceSystem=simulation` (seeded: "Adopt optimised festive price"); "Spend Authority" + "Model Use" policies apply. |
| SECIS (M4) | Executing a change mitigation | Decision with `sourceSystem=secis` (seeded: "Activate backup supplier"); "Change Approval Policy" applies; the supplier risk is in the registry. |
| Marketplace | Vendor/spend actions | Decisions + "Vendor Conduct" / "Spend Authority" policies. |

## Seeded cross-system evidence

The store ships with live, governed items that demonstrate the integration:

- A **Simulation-sourced** decision (festive pricing) — approved, linked to spend
  and model policies.
- A **SECIS-sourced** decision (backup supplier) — approved, linked to the change
  policy, with the corresponding operational risk in the registry and an applied
  mitigation.
- A **Knowledge-sourced** decision (publish model) — in review, with a reviewer
  requesting a rollback plan.

## Guarantees

- No governed action is anonymous: every create/approve/reject/transition writes
  an **AuditRecord** (actor, time, summary, reason).
- Decision **governance-readiness** is computed against the published policies
  that apply to the decision's source system, so cross-system decisions inherit
  the right controls.
- The catalog API (`/api/governance/catalog`) exposes the source systems so other
  systems can construct governed decisions programmatically.

This satisfies M5.13: governance integrates with M1–M4, and every major action in
those systems can be brought under governance from the Governance OS.
