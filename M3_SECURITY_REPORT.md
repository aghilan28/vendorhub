# M3.13 — Permissions & Security Report

Phase: KARTEX M3 — Simulation Operating System
Source: `lib/simulation/permissions.ts`, `store/simulation-store.ts`,
`features/simulation/components/settings-screen.tsx`.

## RBAC

Four platform roles map to permissions via `ROLE_PERMISSION_MATRIX`:

| Permission | admin | analyst | reviewer | viewer |
| --- | :---: | :---: | :---: | :---: |
| simulation.create | ✅ | ✅ | — | — |
| simulation.edit | ✅ | ✅ | — | — |
| simulation.delete | ✅ | — | — | — |
| scenario.run | ✅ | ✅ | ✅ | — |
| review.submit | ✅ | — | ✅ | — |
| approval.record | ✅ | — | ✅ | — |
| decision.record | ✅ | ✅ | — | — |
| settings.manage | ✅ | — | — | — |

Enforcement helpers: `can(user, permission)`, `canView(user, simulation)`,
`canEdit(user, simulation)`. The full matrix is rendered in **Settings →
Role-based access control**, and an acting-user switcher in the header lets a
reviewer verify behavior across roles.

## Ownership & visibility

- Each simulation has an owner and a contributor list with per-contributor roles
  (`owner`, `editor`, `reviewer`, `viewer`).
- Visibility: `private` (owner/contributors only), `team`, `organization`.
- `canView` grants admins and owners/contributors access; non-private
  simulations are visible to others.
- `canEdit` requires ownership, an editor contributor role, or admin.

## UI enforcement

Permission checks gate destructive and privileged actions in the UI:

- Create/edit/clone/delete scenarios → `simulation.edit` / `simulation.delete`.
- Run / launch executions → `scenario.run`.
- Submit reviews → `review.submit`; record approvals → `approval.record`.
- Record decisions → `decision.record`.
- Change workspace settings / reset → `settings.manage`.

Disabled controls show an inline hint instructing which role is required.

## Audit & version history

- Every mutating action appends a timestamped, attributed
  `SimulationHistoryEvent` (see History Center) — creation, updates, runs,
  transitions, reviews, approvals, decisions, versions, templates.
- `saveVersion` captures immutable configuration snapshots; the simulation
  detail page lists the version history.
- Workflow transitions are individually recorded and surfaced in the Workflow
  Engine's "Recent transitions" feed.

## Data handling

- All simulation data is stored client-side (namespaced localStorage key
  `vendorhub-simulation-os`). No PII is collected; demo users are fictitious.
- Server APIs are stateless and compute-only; they neither persist nor read
  user data.
