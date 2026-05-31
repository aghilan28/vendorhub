# EC-6 Phase 11 — Real-World Operations Readiness

**Purpose:** Identify what requires **human operators** after deployment (the systems automate detection + workflow; humans make judgment calls).

---

## Ownership Matrix

| Domain | System provides | Requires human operator for |
|--------|-----------------|-----------------------------|
| Incidents | Detection, lifecycle, postmortem templates, analytics | Declaring severity, root-cause judgment, comms to affected users |
| Disputes | Workflow, evidence capture, resolution recording | Mediation decision (who wins), edge-case judgment |
| Trust & Safety | Risk signals, enforcement recommendations, reversibility flags | Approving irreversible enforcement (bans), appeals review |
| Moderation | Queues, decision recording, audit | Content judgment calls, policy interpretation |
| Escalations | Routing, level tracking | Senior decision on escalated cases |
| Governance | Policy evaluation, decision lineage | Policy authorship, override approval |

---

## Operational Staffing Assumptions (pilot scale)

| Role | Coverage | Rationale |
|------|----------|-----------|
| Trust & Safety operator | 1 (part-time at pilot) | Approve enforcements, review fraud signals |
| Support agent | 1-2 | Ticket resolution, first response |
| Dispute mediator | 1 (shared) | Resolve buyer/seller disputes |
| Ops/Incident owner | 1 (on-call) | Acknowledge + drive incidents |
| Admin/Governance | 1 (founder/admin) | Moderation approvals, policy |

At pilot scale (5-20 sellers, <100 customers) a single admin can cover all roles via `/admin/operations`. The systems **reduce** the human workload by automating detection, routing, SLA tracking, and recommendation — humans provide judgment + approval.

---

## What Requires Human Operators After Deployment

1. **Enforcement approval** — irreversible actions (bans, payout holds) should be human-approved (system flags reversibility).
2. **Dispute outcomes** — final win/lose decision is human judgment (system manages workflow + evidence).
3. **Incident severity & comms** — humans declare severity and communicate to users.
4. **Moderation judgment** — borderline content/policy calls.
5. **Postmortem authorship** — humans write root-cause + lessons (system provides template + timeline).

---

## Verdict

**Operator-ready.** The operational systems automate detection, workflow, SLA tracking, analytics, and recommendations. Human operators provide judgment and approval — appropriate and expected for a real marketplace. A single admin can operate the pilot via the control center; roles scale with volume.

**Status: READY (with documented human-operator ownership).**
