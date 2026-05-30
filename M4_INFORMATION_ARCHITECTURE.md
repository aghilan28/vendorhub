# M4.3 — Information Architecture

Phase: KARTEX M4 — SECIS

The SECIS platform lives under the `(secis)` route group with a dedicated
sidebar + header. All routes exist, are reachable, and render real, persisted
data. Routes that read query params are wrapped in a `Suspense` boundary.

## Route map

| Route | Screen | Section | Status |
| --- | --- | --- | --- |
| `/secis` | Command Center | M4.4 | ✅ |
| `/secis/entities` | Entity Explorer | M4.5 | ✅ |
| `/secis/systems` | System Explorer | M4.6 | ✅ |
| `/secis/dependencies` | Dependency graph + topology | M4 graph | ✅ |
| `/secis/relationships` | Relationships | M4 graph | ✅ |
| `/secis/change-events` | Change Event Studio | M4.7 | ✅ |
| `/secis/evolution` | Evolution Studio | M4.10 | ✅ |
| `/secis/impact` | Impact Analysis Studio | M4.9 | ✅ |
| `/secis/risk` | Risk Center | M4.12 | ✅ |
| `/secis/scenarios` | Scenarios | M4 governance | ✅ |
| `/secis/compare` | Comparison Engine | M4.11 | ✅ |
| `/secis/recommendations` | Recommendation Center | M4.11 | ✅ |
| `/secis/history` | History & Audit Center | M4.13 | ✅ |
| `/secis/workflows` | Workflow Engine | M4.14 | ✅ |
| `/secis/settings` | Settings & Security | governance | ✅ |
| `/secis/[id]` | Change-event detail = **Propagation Engine** (M4.8) | M4.8 | ✅ |

The **Propagation Engine** (M4.8) — the heart of SECIS — is the change-event
detail page (`/secis/[id]`): a visual node-link propagation graph plus impact,
risk, paths, timeline, and recommendations.

## Query parameters (deep-linking)

- `/secis/change-events?type=<eventType>` — open the studio pre-set to a type.
- `/secis/change-events?new=1` — open the create form.
- `/secis/impact?event=<id>` — open impact analysis for an event.
- `/secis/evolution?event=<id>` — open evolution studio for an event.

## Navigation & layout

`lib/constants/navigation.ts → secisNavigation` defines the 15 sidebar entries.
`(secis)/layout.tsx` renders the `DashboardSidebar` (desktop) + a hydration-safe
mobile drawer, the `SecisHeader` with an acting-user / role switcher (to
demonstrate RBAC), and a mounted-once `ExecutionRunner` that advances live
evolution runs across every route.

## Server API surface

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/secis` | GET | Catalog: event types, interventions, impact dimensions. |
| `/api/secis/propagate` | POST | Stateless propagation + impact + risk for a supplied graph. |
| `/api/secis/evolution` | POST | Stateless evolution / recovery simulation with interventions. |

## Reachability

`next build` compiles and renders all 16 `/secis*` routes (15 static + the
dynamic `[id]`) plus the 3 API routes. Static segments take precedence over the
dynamic `[id]` segment, so there is no routing collision.
