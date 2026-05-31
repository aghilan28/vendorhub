# O.6 — System Integration Certification

Verifies that each adjacent pair of subsystems is connected — the output of one
becomes the input of the next — forming one closed loop.

---

## Adjacency certification

| Link | How it is integrated | Evidence | Status |
|------|----------------------|----------|--------|
| Research ↔ Knowledge | Research evidence feeds the knowledge graph; `Knowledge.dependsOn = [research]` | scenario stage 1→2; model dependency | ✅ |
| Knowledge ↔ Simulation | Simulation runs on current knowledge; `Simulation.dependsOn = [knowledge]` | scenario stage 2→3 | ✅ |
| Simulation ↔ SECIS | SECIS validates simulated signals/knowledge; `SECIS.dependsOn = [knowledge, simulation]` | scenario stage 3→4 | ✅ |
| SECIS ↔ Governance | Governance decides on validated, calibrated intelligence; `Governance.dependsOn = [secis, simulation, knowledge]` | scenario stage 4→5 | ✅ |
| Governance ↔ Execution | Approved decisions activate into initiatives + action plans; `Execution.dependsOn = [governance]` | scenario stage 5→6; M8 `applyActivateDecision` (unit-tested) | ✅ |
| Execution ↔ Workspace | Execution OS is operated from the workspace at `/admin/execution` | route builds; workspace nav entry | ✅ |
| Workspace ↔ Showcase | Workspace/Platform link to `/showcase`; Showcase narrates the operated platform | hub + tour CTAs; build | ✅ |

## Closed-loop integrity

- `validatePlatformModel()` asserts every dependency references a known
  subsystem and every scenario traverses the six stages **in order**.
- The decision→execution hand-off is not narrative-only: M8's
  `applyActivateDecision` performs it programmatically and is covered by
  `tests/unit/m8-execution.test.ts`.
- The loop closes: measured outcomes are framed as new signals back to Research
  (Storyboard + Showcase outcome beat).

## Contract layer (M6)

Cross-system calls use shared API contracts and typed envelopes (`lib/api/*`,
`okJson`/`errorJson`), so integration is contract-driven rather than ad-hoc.

**Verdict:** all seven adjacencies are integrated and the loop is closed.
✅ PASS.
