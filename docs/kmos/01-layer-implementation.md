# KMOS Layer Implementation

## Layer 0 Constitutional Core

Responsibilities:

- Maintain canonical constitution source, amendments, invariants, activation manifests, rollback manifests, proof obligations, and compatibility matrices.
- Compile DSL into rule bundles, policy graphs, database constraints, service authorization rules, workflow guards, and model-check specs.
- Reject state transitions that lack legitimacy, safety, reversibility, provenance, fixity, or rollback coverage.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `constitutional-compiler` | DSL parse, AST, IR, codegen | `CompileConstitution`, `CompileAmendment`, `RenderRuleBundle` | Postgres `constitutional_artifacts`, object storage `constitution-bundles` | Compiler pod, cache, parser version |
| `constitutional-validator` | Static checks, proof checks, simulation gate checks | `ValidateBundle`, `ValidateTransition`, `ValidateRollback` | Postgres `validation_runs`, object storage `proof-results` | Model checker workers |
| `constitutional-state-service` | Active constitution read model and activation lock | `GetActiveConstitution`, `GetRule`, `CheckTransition` | Postgres serializable tables, Redis read cache | Primary DB partition |

Event flow:

`ConstitutionDrafted -> ConstitutionCompiled -> ConstitutionValidated -> AmendmentEligible -> AmendmentActivated -> ConstitutionStateChanged`.

Invariants:

- `active_constitution.version` is strictly monotonic.
- Every active rule references a source span, authorizing amendment, validation run, and rollback manifest.
- No rule bundle activates while `proof_status != PASSED`.
- No active constitutional rule may reduce rollback coverage below `1.0` for critical state machines.

Rollback logic:

1. Acquire activation lock.
2. Load last active bundle and rollback manifest.
3. Verify target bundle hash against activation event.
4. Replay inverse migration plan against Postgres, Neo4j, policy graph, and service config.
5. Publish `ConstitutionRollbackCompleted`.
6. Re-open incident and amendment records with causal links.

## Layer 1 Identity

Responsibilities:

- Global DID registry, controller mappings, delegation graph, trust graph, reputation graph, role inheritance graph, power distribution engine, Sybil and capture resistance.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `did-registry` | DID documents and controllers | `RegisterDID`, `RotateController`, `RevokeDID` | Postgres, object storage DID docs | KMS, DB |
| `delegation-service` | Delegation grants and revocations | `CreateDelegation`, `ResolveDelegation`, `RevokeDelegation` | Postgres, Neo4j | Neo4j write leader |
| `role-resolution-service` | Role inheritance and effective authority | `ResolveRoles`, `CheckCapability`, `ExplainAuthority` | Neo4j, Redis | Graph query cluster |
| `power-distribution-service` | Voting power, budget power, compute power, coalition share | `ComputePower`, `DetectCapture`, `PublishPowerSnapshot` | Lakehouse, Postgres | Batch compute |

Event flow:

`DIDRegistered -> ControllerRotated -> DelegationGranted -> RoleResolved -> PowerSnapshotComputed -> CaptureRiskDetected`.

Invariants:

- A DID has at least one active controller and no controller key past `revoked_at`.
- Delegation depth for constitutional authority is at most `3`.
- Effective power of any actor or detected coalition is `< theta_capture`.
- Emergency authority requires independent identity controller quorum.

Rollback logic:

- DID rollback revokes derived delegations, recomputes effective roles, publishes authority invalidation, and invalidates governance votes cast through the rolled-back authority.

## Layer 2 Governance

Responsibilities:

- Proposal creation, deliberation, voting, review, execution, audit, human override, emergency override, policy lifecycle.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `proposal-service` | Proposal records and evidence bundles | `CreateProposal`, `AttachEvidence`, `SubmitForDeliberation` | Postgres, object storage | Proposal DB |
| `deliberation-service` | Argument graph and review windows | `AddArgument`, `CloseDeliberation`, `SummarizeEvidence` | Neo4j, Postgres | Knowledge graph |
| `voting-service` | Ballots, quorum, tally, challenge windows | `OpenVote`, `CastBallot`, `FinalizeVote` | Postgres serializable, Kafka | Tally DB |
| `policy-executor` | Approved governance command execution | `ExecutePolicy`, `AbortExecution`, `AuditExecution` | Temporal, Postgres | Worker pool |
| `override-service` | Emergency and human override workflows | `RequestOverride`, `ApproveOverride`, `TerminateOverride` | Postgres, Kafka | Override quorum |

Event flow:

`ProposalCreated -> EvidenceAttached -> DeliberationOpened -> VoteOpened -> BallotCast -> VoteFinalized -> ProposalApproved -> PolicyExecuted -> AuditRecorded`.

Invariants:

- A proposal cannot enter voting before minimum deliberation duration and evidence completeness pass.
- Ballots are immutable, signed, unique per authority scope, and auditable.
- Emergency override expires automatically at `max_emergency_duration`.
- Executed policy must reference a passed proposal or active emergency override.

Rollback logic:

- Governance rollback issues compensating commands through Temporal, invalidates affected read models, and starts audit reconciliation.

## Layer 3 Economic Coordination

Responsibilities:

- Shadow pricing, resource allocation, constitutional economics, budget allocation, institutional incentives, replicator economics, lineage economics.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `resource-catalog-service` | Resource classes, scarcity, capacity, thermodynamic cost | `RegisterResource`, `UpdateCapacity`, `GetResourceState` | Postgres, lakehouse | Catalog DB |
| `allocation-optimizer` | LP/MILP allocation plans | `SolveAllocation`, `ValidateSolution`, `CommitAllocation` | Object storage, Postgres | Solver workers |
| `shadow-price-service` | Marginal cost and scarcity price computation | `ComputeShadowPrices`, `PublishPriceVector` | Lakehouse, Kafka | Batch compute |
| `incentive-service` | Institutional incentive calculation | `ScoreIncentives`, `ApplyIncentivePolicy` | Postgres | Economic DB |
| `lineage-economics-service` | Cost, benefit, provenance, and externality attribution | `RecordLineageCost`, `QueryLineageValue` | Lakehouse, OpenLineage | Lineage backend |

Event flow:

`ResourceCapacityChanged -> ShadowPriceComputed -> AllocationPlanSolved -> AllocationPlanValidated -> AllocationCommitted -> EconomicAuditRecorded`.

Invariants:

- Allocation never violates constitutional resource floors or physical control ceilings.
- Budget commitments are double-entry balanced.
- Shadow price vector references a resource snapshot hash.
- Replicator dynamics preserve simplex: `sum(strategy_share) = 1`.

Rollback logic:

- Uncommitted plans are discarded; committed plans create reverse allocation events, compensation ledger entries, and recomputed price vectors.

## Layer 4 Knowledge

Responsibilities:

- Observer Situation Lattice, Truth Maintenance System, Belief Graph, contradiction detection, epistemic integrity, MCC execution, RBP execution.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `observer-situation-service` | OSL node and lattice operations | `CreateSituation`, `JoinSituations`, `MeetSituations` | Neo4j, Postgres | Graph write leader |
| `truth-maintenance-service` | JTMS assumptions, justifications, belief status | `AssertBelief`, `RetractBelief`, `ExplainBelief` | Neo4j, Postgres | TMS worker |
| `contradiction-detector` | Contradiction scans and quarantine | `DetectContradictions`, `QuarantineBelief`, `OpenRepairCase` | Neo4j, Kafka | Detector workers |
| `epistemic-integrity-service` | Provenance, trust score, fixity, ontology poison checks | `VerifyEvidence`, `ScoreTrust`, `CheckFixity` | Postgres, vector DB | Evidence DB |
| `knowledge-query-service` | Read APIs and graph traversal | `QueryBeliefs`, `TraverseOntology`, `SearchEvidence` | Neo4j, vector DB | Query replicas |

Event flow:

`EvidenceIngested -> BeliefAsserted -> JustificationLinked -> ContradictionDetected -> BeliefQuarantined -> RepairCaseOpened -> BeliefReconciled`.

Invariants:

- Active belief has non-null provenance chain and `trust_score >= tau`.
- Contradictory beliefs cannot both remain active in the same OSL context without an explicit paraconsistent scope.
- Every ontology mutation has source document, stable ID, and review gate.
- MCC and RBP executions are linked to evidence, rule bundle, and outcome.

Rollback logic:

- Rollback retracts beliefs by causal event range, recomputes JTMS labels, restores previous lattice joins/meets, and republishes affected query projections.

## Layer 5 Intelligence

Responsibilities:

- Policy-constrained intelligence execution, recommendation, search, simulation assistance, proof assistance, and alignment monitoring.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `intelligence-router` | Routes AI jobs to approved models and tools | `SubmitAIJob`, `CancelAIJob`, `GetAIJob` | Postgres, queue | Model gateway |
| `alignment-monitor` | Objective drift and output risk scoring | `ScoreObjectiveDrift`, `BlockUnsafeOutput` | Vector DB, Postgres | Scoring workers |
| `explanation-service` | Explanation capture and lineage links | `RecordExplanation`, `QueryExplanation` | Lakehouse, OpenLineage | Lineage store |

Event flow:

`AIJobSubmitted -> PolicyGatePassed -> AIJobExecuted -> ExplanationRecorded -> AlignmentScoreComputed -> AIJobReleased`.

Invariants:

- AI job execution requires policy gate pass and model authorization.
- Objective distance must satisfy `D(objective_t, constitutional_objective) <= epsilon_align`.
- High-impact outputs require explanation, evidence links, and review trace.

Rollback logic:

- Revoke outputs, remove embeddings derived from revoked outputs, publish affected-decision invalidations, and create governance review cases.

## Layer 6 Simulation

Responsibilities:

- Multi-agent, economic, governance, institutional, population, long-horizon, Monte Carlo, and event replay simulations.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `scenario-service` | Scenario definitions and calibration | `CreateScenario`, `ValidateScenario`, `FreezeScenario` | Postgres, object storage | Scenario DB |
| `simulation-runner` | Deterministic and stochastic simulation runs | `StartSimulation`, `StopSimulation`, `GetRun` | Ray, lakehouse | Compute cluster |
| `monte-carlo-service` | Batch sampling and confidence intervals | `StartMonteCarlo`, `GetDistribution` | Lakehouse | Batch cluster |
| `event-replay-service` | Kafka and state replay into simulation | `CreateReplay`, `RunReplay`, `CompareReplay` | Kafka, object storage | Replay cluster |

Event flow:

`ScenarioCreated -> ScenarioValidated -> SimulationStarted -> SimulationStepRecorded -> SimulationCompleted -> SimulationResultCertified`.

Invariants:

- Certified simulation result references scenario hash, model version, seed set, input snapshot, and output digest.
- Constitutional amendments require simulation gates for capture, stability, rollback, and alignment drift.
- Monte Carlo confidence threshold for high-impact changes is `>= 0.95`.

Rollback logic:

- Simulation artifacts are immutable; rollback marks certification invalid, preserves artifacts, and blocks dependent proposals.

## Layer 7 Resilience

Responsibilities:

- Algedonic loops, rollback engine, checkpointing, snapshotting, recovery, consensus restoration, incident response.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `algedonic-controller` | Pain/pleasure feedback signals and thresholds | `IngestSignal`, `TriggerLoop`, `ResolveLoop` | Prometheus, Postgres | Metrics pipeline |
| `checkpoint-service` | Consistent state checkpoints | `CreateCheckpoint`, `VerifyCheckpoint`, `RestoreCheckpoint` | Object storage, Postgres | Object store |
| `rollback-engine` | Cross-layer rollback plans and execution | `PlanRollback`, `ExecuteRollback`, `VerifyRollback` | Temporal, Postgres | Rollback workers |
| `consensus-restoration-service` | Quorum repair and fork arbitration | `DetectFork`, `ArbitrateFork`, `RestoreConsensus` | Kafka, Postgres, Neo4j | Consensus group |

Event flow:

`AlgedonicSignalRaised -> IncidentOpened -> ContainmentActivated -> CheckpointSelected -> RollbackStarted -> ConsensusRestored -> RecoveryVerified`.

Invariants:

- Every critical service publishes checkpoint capability metadata.
- Rollback cannot start without target checkpoint verification.
- Fork arbitration must preserve constitutional source hash or activate explicit regional fork procedure.

Rollback logic:

- Rollback is itself event-sourced, idempotent, and resumable through Temporal workflow history.

## Layer 8 Evolution

Responsibilities:

- Fitness scoring, institution evolution, Wardley mapping, capability migration, meta-selection, constitutional adaptation.

Services:

| Service | Boundary | APIs | Storage | Failure domain |
| --- | --- | --- | --- | --- |
| `fitness-service` | Institution, policy, capability, and service fitness | `ScoreFitness`, `ExplainFitness`, `PublishFitnessSnapshot` | Lakehouse, Postgres | Analytics cluster |
| `wardley-map-service` | Capability maps and evolution stage tracking | `CreateMap`, `UpdateCapabilityPosition`, `QueryDependencyMap` | Neo4j, Postgres | Graph DB |
| `capability-migration-service` | Planned migration of capabilities across ownership and maturity | `PlanMigration`, `ExecuteMigration`, `ValidateMigration` | Temporal, Postgres | Migration workers |
| `evolution-orchestrator` | Meta-selection and adaptation proposals | `ProposeAdaptation`, `RunSelection`, `SubmitAmendmentCandidate` | Temporal, Kafka | Evolution workers |

Event flow:

`FitnessSnapshotPublished -> CapabilityDriftDetected -> EvolutionCandidateGenerated -> SelectionRunCompleted -> AdaptationProposalCreated`.

Invariants:

- Evolution cannot bypass constitutional amendment lifecycle.
- Fitness functions are versioned, signed, and simulation-calibrated.
- Capability migration preserves ownership, audit, data retention, and rollback bindings.

Rollback logic:

- Migration rollback restores previous capability owner, service route, data contracts, and policy bindings.

