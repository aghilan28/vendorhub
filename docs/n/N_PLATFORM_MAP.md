# N.2 — Platform Map

**Route:** `/platform` (public) → "Platform Map" tab
**Source of truth:** `lib/platform/subsystems.ts`

The Platform Map renders three views: the intelligence flow, the cross-cutting
fabric, and the dependency relationships.

---

## 1. The intelligence flow (six stages)

```
[ Research OS ] → [ Knowledge OS ] → [ Simulation OS ] → [ SECIS ] → [ Governance OS ] → [ Execution OS ]
   M1               M2                 M3                  M4          M5                  M8
 signal           durable            foresight           trust       authorised          measured
 → evidence       knowledge          on outcomes         & integrity decisions           outcomes
```

Signals enter on the left; measured outcomes exit on the right. Each stage's
output is the next stage's input.

## 2. Cross-cutting fabric (two layers)

```
        ┌──────────────────────────────────────────────────────────┐
        │  Workspace Layer (M7) — the human surface to operate it    │
        ├──────────────────────────────────────────────────────────┤
        │  Research → Knowledge → Simulation → SECIS → Gov → Exec     │
        ├──────────────────────────────────────────────────────────┤
        │  Integration Layer (M6) — shared contracts & data flow      │
        └──────────────────────────────────────────────────────────┘
```

- **Integration Layer (M6)** binds the subsystems with shared contracts so
  intelligence flows with no manual re-entry.
- **Workspace Layer (M7)** is where people see, navigate and act on the platform.

## 3. Dependency relationships

| Subsystem | Depends on |
|-----------|------------|
| Research OS | — (entry point) |
| Knowledge OS | Research |
| Simulation OS | Knowledge |
| SECIS | Knowledge, Simulation |
| Governance OS | SECIS, Simulation, Knowledge |
| Execution OS | Governance |
| Integration Layer | Research, Knowledge, Simulation, SECIS, Governance |
| Workspace Layer | Integration |

These relationships are encoded in `Subsystem.dependsOn` and validated by
`validatePlatformModel()` (every dependency must reference a known subsystem).

## 4. Flows

- **Primary flow:** the six-stage intelligence pipeline above.
- **Decision activation flow:** an approved Governance decision becomes an
  Execution initiative + action plan with no re-entry (delivered in M8).
- **Closed loop:** measured outcomes become new signals back into Research.

## 5. Map as data

The visual map is generated from a deterministic model, so it can never drift
from the documented architecture. Tests assert the flow order
(`research → knowledge → simulation → secis → governance → execution`) and the
6 + 2 (flow + fabric) subsystem split.
