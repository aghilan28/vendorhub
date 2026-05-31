# EC-6 Phase 2 — Incident Management Certification

**Source:** `lib/marketplace-operations/incidents.ts`, `/admin/operations` (Incidents tab), `autonomous-operations/incident-intelligence.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Incident creation | ✅ REAL | `createIncident({type, severity, title, impact*, owner})` |
| Incident lifecycle | ✅ REAL | guarded `transitionIncident`; illegal transitions throw (tested) |
| Severity levels | ✅ REAL | `low / medium / high / critical / catastrophic` |
| Ownership | ✅ REAL | `ownerId`/`ownerName` + `addResponder` |
| Resolution workflows | ✅ REAL | transition to `resolved` sets `resolvedAt` |
| Postmortems | ✅ REAL | `addPostmortem` (root cause, lessons, action items) → `post_mortem` state |
| Incident reporting | ✅ REAL | `computeIncidentAnalytics` (MTTR, MTTA, by type/severity, postmortem rate) |
| Operational visibility | ✅ REAL | `/admin/operations` Incidents tab |

## Mandated status mapping (implemented → directive)
| Directive | Implemented |
|-----------|-------------|
| OPEN | `detected` |
| ACKNOWLEDGED | `acknowledged` |
| INVESTIGATING | `investigating` |
| MITIGATED | `mitigating` |
| RESOLVED | `resolved` |
| CLOSED | `closed` (+ `post_mortem` intermediate) |

All six mandated statuses are present (the engine adds `post_mortem` for postmortem governance).

## Executed evidence (`ec6-operations-scale.test.ts`)
Full lifecycle `detected → acknowledged → investigating → mitigating → resolved → post_mortem` executed; illegal skip rejected; analytics over 100/1,000 incidents.

**Status: PASS.**
