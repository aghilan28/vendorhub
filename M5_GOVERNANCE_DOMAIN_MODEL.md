# M5.2 — Governance Domain Model

Phase: KARTEX M5 — Governance Operating System
Source of truth: `lib/governance-os/types.ts`

22 first-class entities, each with schema, relationships, lifecycle,
ownership, permissions, and governance treatment.

## Entity catalog

| # | Entity | Purpose | Key relationships |
| --- | --- | --- | --- |
| 1 | **Policy** | A governed rule-set with a lifecycle. | Has Rules; belongs to a Category; has owner/reviewers/approvers; applies to source systems; linked to Controls. |
| 2 | **PolicyRule** | A single mandatory/advisory rule with violation severity. | Belongs to a Policy; may reference a Control. |
| 3 | **PolicyCategory** | Catalog of policy domains (data, security, financial…). | Referenced by Policies. |
| 4 | **PolicyVersion** | Immutable snapshot of a policy at a version. | Belongs to a Policy. |
| 5 | **Decision** | A governed decision with ownership and accountability. | Sourced from an OS (research/knowledge/simulation/secis/marketplace/internal); has reviews/approvals; relates to Policies. |
| 6 | **DecisionReview** | A reviewer verdict (approve / request changes / reject / comment). | Belongs to a Decision. |
| 7 | **DecisionApproval** | An approver record (`approved=true`). | Belongs to a Decision. |
| 8 | **DecisionRejection** | An approver record (`approved=false`) — same `DecisionApproval` shape. | Belongs to a Decision. |
| 9 | **DecisionOwner** | Ownership / accountability assignment (`OwnershipRef`). | Owner + accountable party on a Decision/Policy. |
| 10 | **GovernanceWorkflow** | A lifecycle definition (states + transitions). | `WorkflowDefinition` for policy/decision/exception. |
| 11 | **GovernanceAction** | An action taken by an actor (audited). | Part of the Audit stream (`AuditRecord`). |
| 12 | **GovernanceEvent** | A governance event (audited). | Part of the Audit stream. |
| 13 | **GovernanceRisk** | A governance risk with severity, likelihood, score, ownership, and history. | May relate to Policies; tracked in the Risk registry. |
| 14 | **GovernanceControl** | A preventive/detective/corrective control. | Linked to Policies; checked by Compliance Checks. |
| 15 | **ComplianceCheck** | An assessment of a control's effectiveness. | Belongs to a Control; may reference a Policy. |
| 16 | **AuditRecord** | An immutable who/what/when/why record. | References any object type. |
| 17 | **AuditTrail** | The ordered collection of Audit Records (`AuditRecord[]`). | The full history. |
| 18 | **ExceptionRequest** | A request to deviate from a policy, with expiry. | Belongs to a Policy; has Exception Approvals. |
| 19 | **ExceptionApproval** | An approver record for an exception. | Belongs to an ExceptionRequest. |
| 20 | **GovernanceRecommendation** | A generated governance suggestion (gap/risk/overdue/compliance/ownership). | References an object. |
| 21 | **GovernanceReport** | A generated, exportable report (policy/decision/risk/compliance/audit). | Built from the relevant entities. |
| 22 | **GovernanceDashboard** | Computed command-center analytics. | Aggregates everything. |

Supporting: `GovernanceUser` + `PlatformRole` (RBAC), `Permission`,
`GovernanceSettings`, `OwnershipRef`.

## Lifecycles

- **Policy**: `draft → review → approved → published → archived`.
- **Decision (approval workflow)**: `draft → review → approved | rejected | exception → archived`.
- **Exception**: `requested → review → approved | rejected → expired → archived`.
- **Risk**: `open → mitigating → resolved | accepted`.

All transitions are validated by `WORKFLOW_TRANSITIONS` and audited.

## Ownership, permissions, governance

- Policies and decisions carry an **owner**; decisions additionally carry an
  **accountable** party, plus reviewer and approver lists.
- Six platform roles (`governance_admin`, `policy_owner`, `reviewer`,
  `approver`, `auditor`, `viewer`) map to 10 permissions
  (`policy.manage`, `policy.approve`, `decision.create`, `decision.review`,
  `decision.approve`, `risk.manage`, `exception.request`, `exception.approve`,
  `report.generate`, `settings.manage`).
- Every mutating action appends an **AuditRecord** (actor, timestamp, summary,
  reason, field-level changes) — the who / what / when / why required by M5.8.

## Computed governance

- **Risk score** = severity × likelihood weighting (0–100, with level).
- **Compliance score** = pass + ½·warning over assessed checks; plus coverage.
- **Decision governance-readiness** = owner + accountable + reviewer + linked
  applicable policy + required approvals met → a 0–100 readiness score and gaps.

## Persistence

Persisted client-side via `store/governance-store.ts`
(zustand + `persist`, key `vendorhub-governance-os`), seeded with realistic
policies, decisions, risks, controls, checks, exceptions, and audit history —
including governable items sourced from Simulation (M3) and SECIS (M4). Server
APIs (`/api/governance/*`) expose the same engine for stateless evaluation.
