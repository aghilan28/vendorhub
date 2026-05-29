# Observability

## OpenTelemetry

Trace attributes:

| Attribute | Type | Applies to |
| --- | --- | --- |
| `kmos.layer` | int | all spans |
| `kmos.constitution.version` | string | all command spans |
| `kmos.actor.did` | string | commands, governance, identity |
| `kmos.proposal.id` | string | governance |
| `kmos.amendment.id` | string | constitutional |
| `kmos.belief.id` | string | knowledge |
| `kmos.simulation.run_id` | string | simulation |
| `kmos.incident.id` | string | resilience |
| `kmos.checkpoint.id` | string | rollback |

Metrics:

| Subsystem | Metrics | SLI | SLO | Error budget |
| --- | --- | --- | --- | --- |
| Constitutional compiler | `compile_duration_seconds`, `compile_failures_total`, `artifact_hash_mismatch_total` | compile success | 99.5% successful compiles per 30d | 0.5% |
| Constitutional validator | `proof_duration_seconds`, `model_check_failures_total`, `counterexamples_total` | validation availability | 99% validation jobs complete under 30m | 1% |
| Identity | `did_resolution_latency_seconds`, `delegation_resolution_latency_seconds`, `capture_risk_score` | authority check latency | 99% under 200ms | 1% |
| Governance | `proposal_state_age_seconds`, `vote_finalize_latency_seconds`, `execution_success_ratio` | workflow completion | 99% approved policies execute or compensate | 1% |
| Economics | `allocation_solve_duration_seconds`, `allocation_infeasible_total`, `ledger_imbalance_total` | valid allocation | 99.9% committed allocations balanced | 0.1% |
| Knowledge | `belief_assert_latency_seconds`, `contradiction_rate`, `repair_case_age_seconds` | epistemic repair time | 95% contradictions repaired under 72h | 5% |
| Simulation | `simulation_runtime_seconds`, `simulation_certification_ratio`, `monte_carlo_confidence` | certification availability | 99% required simulations complete under policy window | 1% |
| Resilience | `incident_mtta_seconds`, `incident_mttr_seconds`, `rollback_verify_duration_seconds` | recovery | SEV1 containment under 15m, rollback under 4h | 2% |
| Evolution | `fitness_compute_duration_seconds`, `migration_success_ratio` | migration validity | 99% migrations validate or rollback | 1% |

Logs:

- JSON logs with `trace_id`, `span_id`, `event_id`, `actor_did`, `constitution_version`, `service`, `layer`, `severity`.
- Audit logs are append-only and mirrored to object storage.
- Security logs retain for 7y minimum.

Grafana dashboards:

- Constitutional Health: CHI, proof pass rate, rollback coverage, active version.
- Governance Operations: proposal throughput, vote participation, execution success, overrides.
- Identity Power: CTI, max control share, delegation depth, controller rotations.
- Epistemic Integrity: EII, contradiction rate, repair queue, trust score distribution.
- Economic Coordination: allocation feasibility, shadow price drift, budget balance.
- Simulation Certification: run status, confidence intervals, counterexample trends.
- Resilience: incident status, MTTA, MTTR, checkpoint freshness, replay lag.
- Evolution: fitness trends, Wardley stage movement, migration states.

Alertmanager routes:

- `CIVILIZATIONAL`: page Constitutional Core Council, Resilience Council, Platform SRE.
- `SEV1`: page owning council and Platform SRE.
- `SEV2`: owning council Slack and ticket.
- `WARN`: dashboard annotation and backlog item.

# Kubernetes Deployment

## Helm Charts

```text
infrastructure/kmos/charts/kmos-platform
  Chart.yaml
  values.yaml
  templates/namespaces.yaml
  templates/serviceaccounts.yaml
  templates/rbac.yaml
  templates/networkpolicies.yaml
  templates/servicemonitors.yaml

infrastructure/kmos/charts/kmos-service
  Chart.yaml
  values.yaml
  templates/deployment.yaml
  templates/service.yaml
  templates/hpa.yaml
  templates/pdb.yaml
  templates/externalsecret.yaml
  templates/authorizationpolicy.yaml
```

## Kustomize Overlays

```text
infrastructure/kmos/overlays/dev
infrastructure/kmos/overlays/staging
infrastructure/kmos/overlays/prod-us
infrastructure/kmos/overlays/prod-eu
infrastructure/kmos/overlays/prod-in
```

## Operators and CRDs

CRDs:

```yaml
apiVersion: kmos.kartex.io/v1
kind: ConstitutionBundle
spec:
  version: "9.0.0"
  artifactMerkleRoot: "sha256:..."
  bundleUri: "s3://kmos-constitution-bundles/9.0.0.bundle"
  activationPolicy: GOVERNANCE_APPROVED
---
apiVersion: kmos.kartex.io/v1
kind: GovernanceWorkflow
spec:
  proposalId: "018fd9..."
  workflowType: POLICY_EXECUTION
  constitutionVersion: "9.0.0"
---
apiVersion: kmos.kartex.io/v1
kind: SimulationRun
spec:
  scenarioId: "sim-elite-capture"
  seed: 42
  monteCarlo: true
---
apiVersion: kmos.kartex.io/v1
kind: RecoveryPlan
spec:
  incidentId: "inc-018fd9"
  checkpointPolicy: PRE_INCIDENT_VERIFIED
```

Operators:

- `constitution-operator`: watches `ConstitutionBundle`, validates activation, rolls out generated policy config.
- `governance-operator`: watches `GovernanceWorkflow`, starts Temporal workflows.
- `simulation-operator`: provisions Ray jobs for `SimulationRun`.
- `recovery-operator`: executes `RecoveryPlan` through rollback engine.

## RBAC

- Service accounts are per service and namespace.
- Constitutional activation permissions are limited to `constitution-operator`.
- Rollback permissions are limited to `recovery-operator` and require approval token secret.
- Read-only observer apps cannot access command topics.

## Network Policies

- Default deny ingress and egress.
- Services may call only declared dependencies.
- Validator workers can access object storage, model-checker pods, and Postgres.
- Intelligence services cannot call governance execution endpoints.
- Public observer accesses read-only query gateway only.

## Service Mesh

- Istio mTLS strict mode.
- AuthorizationPolicy enforces service-to-service capability.
- RequestAuthentication validates workload JWT.
- Envoy access logs include `x-kmos-constitution-version`.

## Secrets

- External Secrets Operator pulls from Vault.
- KMS signing keys are non-exportable.
- DID controller keys rotate every 90d or on incident.
- Emergency override approval tokens use threshold secret sharing.

## Multi-Region Active-Active

Regions:

- `prod-us`
- `prod-eu`
- `prod-in`

Replication:

- Kafka MirrorMaker 2 with topic allowlist and offset sync.
- Postgres logical replication for read models; single-writer per constitutional activation lock.
- Neo4j fabric/read replicas per region with leader election for writes.
- Object storage cross-region replication with object lock.

Failover:

1. Detect regional health failure through SLO burn and consensus heartbeat.
2. Freeze constitutional activation in affected region.
3. Promote healthy region for command intake.
4. Reconcile Kafka offsets and Postgres replication slots.
5. Run consensus restoration workflow.
6. Re-enable regional command routes after invariant verification.

# Execution Roadmap

## Generation 0

Deliverables:

- Monorepo structure, protobuf contracts, constitutional DSL parser, TLA skeletons, Kafka topics, Postgres base schemas.

Services:

- `constitutional-compiler`
- `constitutional-state-service`
- `identity-graph-service`

Verification milestones:

- DSL parse/type tests pass.
- `KMOSConstitution` model checks pass for bounded states.
- Protobuf compatibility check in CI.

Operational readiness:

- Dev Helm deploy.
- OTEL traces from compiler and identity services.
- Backup/restore drill for Postgres dev.

## Generation 1

Deliverables:

- Amendment lifecycle, proposal lifecycle, voting workflow, DID/delegation role resolution, audit log.

Services:

- `amendment-orchestrator`
- `governance-orchestrator`
- `voting-service`
- `delegation-service`

Verification milestones:

- Quorum, capture, and vote integrity tests.
- Temporal compensation tests.
- Kafka replay test for governance events.

Operational readiness:

- Staging deploy with Kafka, Temporal, Postgres, Neo4j.
- SLO dashboards and Alertmanager routes.

## Generation 2

Deliverables:

- Economic allocation engine, shadow pricing, resource floors, budget ledger, lineage economics.

Services:

- `economic-coordinator`
- `allocation-optimizer`
- `shadow-price-service`
- `lineage-economics-service`

Verification milestones:

- LP feasibility regression suite.
- Ledger balance invariant.
- Resource floor invariant.

Operational readiness:

- Solver worker autoscaling.
- Economic audit lakehouse tables.

## Generation 3

Deliverables:

- OSL, JTMS/TMS, belief graph, contradiction detection, MCC, RBP, evidence trust scoring.

Services:

- `knowledge-integrity-service`
- `truth-maintenance-service`
- `contradiction-detector`
- `knowledge-query-service`

Verification milestones:

- Contradiction repair workflows.
- Provenance invariant.
- Neo4j graph consistency scan.

Operational readiness:

- Vector DB snapshots.
- Knowledge repair runbooks.

## Generation 4

Deliverables:

- Multi-agent simulation, governance/economic/institutional/population simulation, Monte Carlo, event replay.

Services:

- `scenario-service`
- `simulation-runner`
- `monte-carlo-service`
- `event-replay-service`

Verification milestones:

- Certified simulation result hashes.
- Monte Carlo confidence gate.
- Replay digest comparison.

Operational readiness:

- Ray cluster deployment.
- Simulation artifact retention policies.

## Generation 5

Deliverables:

- Meta-measurement CHI/EII/GEI/CTI/IVI, incident taxonomy engine, algedonic loops, checkpointing, rollback, consensus restoration.

Services:

- `metric-aggregator`
- `incident-classifier`
- `algedonic-controller`
- `checkpoint-service`
- `rollback-engine`
- `consensus-restoration-service`

Verification milestones:

- SEV1 rollback drill under 4h.
- Checkpoint fixity verification.
- Incident state machine model check.

Operational readiness:

- Multi-region failover drill.
- Error budget policy enforced.

## Generation 10+

Deliverables:

- Evolution engine, Wardley mapping, fitness scoring, capability migration, meta-selection, constitutional adaptation.

Services:

- `fitness-service`
- `wardley-map-service`
- `capability-migration-service`
- `evolution-orchestrator`

Verification milestones:

- Fitness function signature checks.
- Migration rollback tests.
- Evolution proposal simulation certification.

Operational readiness:

- Active-active production operations.
- Quarterly constitutional rollback exercise.
- Permanent audit and preservation workflows.

