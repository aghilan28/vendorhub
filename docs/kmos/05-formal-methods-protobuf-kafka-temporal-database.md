# Formal Methods

## TLA+ Modules

| Module | State space | Safety invariants | Liveness invariants |
| --- | --- | --- | --- |
| `KMOSConstitution` | amendment lifecycle, active constitution, rollback state | `TypeOK`, `SingleActiveConstitution`, `NoActivationWithoutProof`, `RollbackAvailable`, `CaptureResistance` | `ApprovedEventuallyActivatesOrRollsBack`, `RollbackEventuallyCompletes` |
| `KMOSGovernance` | proposal, vote, execution, override | `OneBallotPerVoter`, `QuorumRequired`, `BoundedEmergency`, `ExecutionRequiresApproval` | `ApprovedProposalEventuallyExecutes` |
| `KMOSIdentity` | DID, delegation, role, power | `NoRevokedController`, `DelegationDepthBounded`, `NoDelegationCycle`, `PowerBelowCaptureThreshold` | `RevocationEventuallyInvalidatesAuthority` |
| `KMOSKnowledge` | belief, justification, contradiction, repair | `ActiveBeliefHasProvenance`, `ContradictionQuarantined`, `RepairCaseTraceable` | `OpenContradictionEventuallyReviewed` |
| `KMOSEconomics` | resource, allocation, ledger, price vector | `ResourceFloorsHeld`, `LedgerBalanced`, `PriceVectorReferencesSnapshot` | `FeasiblePlanEventuallyCommittedOrRejected` |
| `KMOSResilience` | incident, containment, checkpoint, rollback | `RollbackUsesVerifiedCheckpoint`, `NoResumeBeforeVerification` | `ContainedIncidentEventuallyResolvedOrEscalated` |

## Verification Strategy

1. Generate TLA constants from compiled constitution bundle.
2. Model check bounded amendment, governance, identity, knowledge, economics, resilience, and evolution state machines on every bundle.
3. Store counterexamples as immutable validation artifacts.
4. Run TLAPS proofs for invariants marked `CIVILIZATIONAL`.
5. Run SMT checks for arithmetic constraints: quorum, budget balance, resource floor, capture threshold.
6. Run simulation counterexample tests using model-check traces as seeds.

## Model Checking Strategy

| Check | Tool | Bound | Required result |
| --- | --- | --- | --- |
| State machine safety | TLC | `actors <= 7`, `proposals <= 5`, `amendments <= 3` | no invariant violation |
| Symbolic transition safety | Apalache | bounded transition depth `20` | unsat for bad state |
| Arithmetic constraints | Z3 | exact rational arithmetic | unsat for invariant negation |
| Proof obligations | TLAPS | unbounded theorem proofs | proof accepted |
| Regression counterexamples | TLC trace runner | all stored traces | repaired invariant remains true |

# Protobuf Contracts

Canonical file: `proto/kmos/v1/kmos.proto`

Versioning:

- Package uses semantic API namespace `kmos.v1`.
- Field numbers are never reused.
- Removed fields are reserved by name and number.
- Breaking changes require `kmos.v2`.
- Events are append-only; consumers ignore unknown fields.
- Commands are idempotent through `CommandEnvelope.idempotency_key`.

Topic payload rules:

- Commands use `CommandEnvelope`.
- Events use `EventEnvelope`.
- Queries use typed request/response messages and are not sent to Kafka.
- Dead letter payloads use `DeadLetterEvent`.

# Kafka Topology

| Topic | Partitions | Retention | Replication | Producers | Consumers | DLQ |
| --- | ---: | --- | ---: | --- | --- | --- |
| `kmos.constitution.commands.v1` | 12 | 14d | 3 | console, governance orchestrator | amendment orchestrator | `kmos.constitution.commands.dlq.v1` |
| `kmos.constitution.events.v1` | 24 | compact + 365d | 5 | constitutional state service | all services, lakehouse sink | `kmos.constitution.events.dlq.v1` |
| `kmos.governance.proposal.events.v1` | 24 | 365d | 3 | proposal service | voting, audit, simulation | `kmos.governance.proposal.events.dlq.v1` |
| `kmos.governance.vote.events.v1` | 24 | 365d | 3 | voting service | proposal, amendment, audit | `kmos.governance.vote.events.dlq.v1` |
| `kmos.identity.events.v1` | 24 | compact + 365d | 5 | identity services | governance, economics, audit | `kmos.identity.events.dlq.v1` |
| `kmos.economics.events.v1` | 24 | 365d | 3 | economic coordinator | governance, metric aggregator | `kmos.economics.events.dlq.v1` |
| `kmos.knowledge.events.v1` | 36 | 365d | 3 | knowledge services | governance, intelligence, metric aggregator | `kmos.knowledge.events.dlq.v1` |
| `kmos.simulation.events.v1` | 36 | 180d | 3 | simulation runner | governance, evolution, lakehouse | `kmos.simulation.events.dlq.v1` |
| `kmos.measurement.events.v1` | 12 | 90d | 3 | metric aggregator | alertmanager bridge, dashboards | `kmos.measurement.events.dlq.v1` |
| `kmos.incident.events.v1` | 24 | 365d | 5 | incident classifier, resilience controller | all services | `kmos.incident.events.dlq.v1` |
| `kmos.evolution.events.v1` | 12 | 365d | 3 | evolution orchestrator | governance, simulation | `kmos.evolution.events.dlq.v1` |

Partition keys:

- Constitution: `constitution_version`
- Amendment/proposal/vote: `proposal_id` or `amendment_id`
- Identity: `did`
- Knowledge: `belief_id` or `repair_case_id`
- Economics: `allocation_plan_id`
- Incident: `incident_id`

Replay workflows:

1. Create checkpoint selection record.
2. Pause affected consumer groups.
3. Seek partitions to checkpoint offsets.
4. Replay into isolated projection namespace.
5. Compare projection digest.
6. Promote projection after validator pass.
7. Resume consumer groups.

# Temporal Workflows

| Workflow | Task queue | Activities | Compensation |
| --- | --- | --- | --- |
| `ConstitutionalAmendmentWorkflow` | `constitutional` | compile, validate, simulate, open vote, activate | rollback activation |
| `VotingWorkflow` | `governance` | open vote, ingest ballots, finalize tally, challenge window | invalidate tally |
| `PolicyExecutionWorkflow` | `governance` | execute commands, verify audit, publish completion | execute compensation bundle |
| `SimulationWorkflow` | `simulation` | freeze inputs, run simulation, certify result | invalidate certification |
| `MonteCarloWorkflow` | `simulation` | partition seeds, run workers, aggregate distribution | cancel partitions |
| `EvolutionWorkflow` | `evolution` | score fitness, generate candidate, run selection, create proposal | cancel migration |
| `KnowledgeRepairWorkflow` | `knowledge` | quarantine, review evidence, repair, recompute JTMS | restore previous labels |
| `RecoveryWorkflow` | `resilience` | classify, contain, checkpoint, rollback, verify | escalate incident |
| `ConsensusRestorationWorkflow` | `resilience` | detect fork, arbitrate, restore, replay | activate regional fork procedure |

Workflow guard rules:

- Workflow start requires command envelope signature and idempotency key.
- High-impact workflows require active constitution version in search attributes.
- Activity retries use exponential backoff capped at `15m`.
- Compensation activities are idempotent and record completion hashes.

# Database Architecture

## PostgreSQL

Purpose:

- System-of-record for transactional state: amendments, proposals, votes, DIDs, delegations, allocations, incidents, checkpoints, metrics.

Partitioning:

- Time-partition `kmos_incident_events`, `kmos_metric_points`, `kmos_reputation_events` monthly.
- Hash-partition `kmos_votes` by `proposal_id`.
- Hash-partition `kmos_delegations` by `delegate_did`.

Backup/restore:

- Continuous WAL archiving with 5-minute RPO.
- Daily logical dumps for constitutional and governance tables.
- Quarterly restore drill using `kmos_checkpoints`.

## Neo4j

Purpose:

- Identity, trust, delegation, role inheritance, knowledge ontology, belief graph, Wardley maps, and coalition detection.

Indexes:

- Unique constraints for DID, Role, Belief, Evidence, Situation, Capability.
- Relationship property indexes for delegation status and validity windows.

Backup/restore:

- Full graph snapshot every 6h.
- Transaction log shipping to standby cluster.
- Restore requires graph consistency scan and projection digest match.

## Lakehouse

Purpose:

- Immutable events, simulation results, metric histories, lineage economics, model calibration, audit analytics.

Tables:

- `events_constitution`
- `events_governance`
- `events_identity`
- `events_economics`
- `events_knowledge`
- `simulation_results`
- `metric_history`
- `openlineage_runs`

Format:

- Iceberg tables on object storage.
- Partition by `event_date`, `event_type`, `scope`.

Retention:

- Constitutional/governance/security audit: permanent.
- Metrics: raw 2y, downsampled permanent.
- Simulation artifacts: permanent when used as governance evidence, otherwise 5y.

## Vector DB

Purpose:

- Evidence retrieval, semantic search, belief support search, policy similarity, simulation scenario similarity.

Collections:

- `knowledge_evidence_v1`
- `constitutional_rules_v1`
- `governance_arguments_v1`
- `simulation_scenarios_v1`

Indexes:

- HNSW cosine, `m=32`, `ef_construction=256`.
- Metadata filters: `source_document`, `trust_score`, `constitution_version`, `scope`.

Backup/restore:

- Snapshot collection daily.
- Store embedding model hash with each vector.
- Rebuild index from lakehouse evidence if snapshot verification fails.

## Object Storage

Buckets:

- `kmos-constitution-bundles`
- `kmos-proof-results`
- `kmos-simulation-artifacts`
- `kmos-checkpoints`
- `kmos-audit-archives`
- `kmos-evidence-objects`

Policies:

- Object lock enabled for constitutional bundles, proof results, audit archives, and governance evidence.
- SHA-256 fixity recorded in Postgres and verified weekly.
- Multi-region replication for permanent buckets.

