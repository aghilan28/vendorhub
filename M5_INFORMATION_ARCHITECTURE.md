# M5.3 — Information Architecture

Phase: KARTEX M5 — Governance Operating System

The Governance OS lives under the `(governance)` route group with a dedicated
sidebar + header. All routes exist, are reachable, and render real, persisted
data.

## Route map

| Route | Screen | Section | Status |
| --- | --- | --- | --- |
| `/governance` | Governance Command Center | M5.4 | ✅ |
| `/governance/policies` | Policy Management Center | M5.5 | ✅ |
| `/governance/policies/[id]` | Policy detail (lifecycle, rules, versions) | M5.5 | ✅ |
| `/governance/decisions` | Decision Center | M5.6 | ✅ |
| `/governance/decisions/[id]` | Decision detail (review/approve/reject) | M5.6 | ✅ |
| `/governance/reviews` | Reviews queue | M5.6 | ✅ |
| `/governance/approvals` | Approvals queue | M5.7 | ✅ |
| `/governance/rejections` | Rejections log | M5.7 | ✅ |
| `/governance/workflows` | Approval Workflow Engine | M5.7 | ✅ |
| `/governance/audit` | Audit Center (visual timeline) | M5.8 | ✅ |
| `/governance/compliance` | Compliance Center | M5.9 | ✅ |
| `/governance/risks` | Risk Governance Center | M5.10 | ✅ |
| `/governance/exceptions` | Exception Management | M5.11 | ✅ |
| `/governance/reports` | Governance Reporting (export) | M5.12 | ✅ |
| `/governance/history` | Full governance history | M5.8 | ✅ |
| `/governance/settings` | Settings & Security (RBAC) | governance | ✅ |

Two dynamic detail routes (`policies/[id]`, `decisions/[id]`) coexist with the
static segments without collision.

## Query parameters (deep-linking)

- `/governance/decisions?new=1` and `?source=<system>` — create a decision,
  optionally pre-set to a source OS.
- `/governance/policies?new=1` — open the policy create form.
- `/governance/reviews`, `/governance/approvals` — filtered work queues that
  link into the decision detail.

## Navigation & layout

`lib/constants/navigation.ts → governanceNavigation` defines the 14 sidebar
entries. `(governance)/layout.tsx` renders the `DashboardSidebar` (desktop) + a
hydration-safe mobile drawer, and the `GovernanceHeader` with an acting-user /
role switcher to demonstrate RBAC.

## Server API surface

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/governance/catalog` | GET | Policy categories, decision types, source systems, risk categories, workflows. |
| `/api/governance/evaluate` | POST | Stateless risk scoring + decision governance-readiness evaluation. |

(The pre-existing `/api/governance/detection` marketplace-moderation endpoint is
left untouched.)

## Reachability

`next build` compiles all 16 `/governance*` routes plus the 2 new API routes.
