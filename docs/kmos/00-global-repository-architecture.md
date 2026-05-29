# KMOS Global Repository Architecture

Repository root: `/`

| Path | Purpose | Ownership | Dependencies | Bounded context |
| --- | --- | --- | --- | --- |
| `/apps/kmos-console` | Human operator UI for proposals, votes, simulations, incidents, evolution runs, lineage, and metric dashboards. | Platform Applications | `packages/ui`, `proto/kmos/v1`, `services/*` APIs | Operator experience |
| `/apps/kmos-public-observer` | Public transparency portal exposing finalized constitutional state, audit trails, metric aggregates, and non-sensitive simulations. | Transparency Council | `knowledge-query-service`, `governance-query-service` | Public accountability |
| `/apps/kmos-mobile-observer` | Mobile observer client for alerts, votes, emergency override acknowledgements, and delegation review. | Identity Council | `identity-api`, `governance-api` | Mobile participation |
| `/services/constitutional-compiler` | Parses DSL, builds AST, compiles canonical rule bundles, emits proof obligations. | Constitutional Core Council | `contracts/constitutional`, `packages/dsl`, Postgres, object storage | Constitutional compilation |
| `/services/constitutional-validator` | Runs static validation, invariant checks, TLA model checks, signature validation, and compatibility gates. | Formal Methods Guild | Apalache, TLC, TLAPS, `contracts/formal` | Formal validation |
| `/services/amendment-orchestrator` | Temporal worker for amendment lifecycle from draft to activation and rollback. | Governance Council | Temporal, Kafka, Postgres, validator services | Constitutional amendment workflow |
| `/services/identity-graph-service` | DID registry, controller mappings, delegation graph, trust graph, role resolution, capture share computation. | Identity Council | Postgres, Neo4j, Kafka, KMS | Identity and authority |
| `/services/governance-orchestrator` | Proposal lifecycle, deliberation, voting, review, execution, audit, emergency overrides. | Governance Council | Temporal, Kafka, Postgres, identity graph | Governance execution |
| `/services/economic-coordinator` | Shadow pricing, allocation planning, budget constraints, VCG/XOS auction adapters, lineage economics. | Economic Council | LP solvers, Postgres, lakehouse, Kafka | Resource coordination |
| `/services/knowledge-integrity-service` | Observer Situation Lattice, JTMS/TMS, belief graph integrity, contradiction detection, consistency repair. | Knowledge Council | Neo4j, Postgres, vector DB, Kafka | Epistemic integrity |
| `/services/intelligence-coordinator` | Policy-constrained AI task routing, embeddings, explanation capture, alignment drift scoring. | Intelligence Council | Vector DB, object storage, OpenTelemetry | Intelligence execution |
| `/services/simulation-runner` | Multi-agent, governance, economic, institutional, population, Monte Carlo, and replay simulation runs. | Simulation Council | Ray, Temporal, lakehouse, Kafka | Simulation execution |
| `/services/metric-aggregator` | CHI, EII, GEI, CTI, IVI aggregation, thresholds, SLO export, dashboard materialization. | Resilience Council | Prometheus, Postgres, lakehouse | Meta-measurement |
| `/services/incident-classifier` | Failure taxonomy detection, incident state machine, containment policy selection, verification gates. | Resilience Council | Kafka, Alertmanager, Temporal | Failure handling |
| `/services/resilience-controller` | Algedonic loops, checkpointing, snapshotting, rollback execution, consensus restoration. | Resilience Council | Object storage, Postgres WAL, Kafka replay, Temporal | System recovery |
| `/services/evolution-orchestrator` | Fitness scoring, institution evolution, Wardley mapping, capability migration, constitutional adaptation. | Evolution Council | Simulation runner, governance orchestrator, knowledge graph | Evolution |
| `/packages/dsl` | Constitutional DSL lexer, parser, AST, compiler IR, validation library, canonical serializer. | Constitutional Core Council | ANTLR, TypeScript/Rust bindings | DSL toolchain |
| `/packages/sdk` | Generated clients for commands, queries, events, workflow starters, and audit readers. | Developer Platform | `proto/kmos/v1` | External integration |
| `/packages/domain` | Shared typed domain objects, state enums, invariant definitions, and event envelopes. | Architecture Council | Protobuf, JSON Schema | Domain contracts |
| `/packages/crypto` | DID verification, signature envelopes, hash chains, Merkle proofs, quorum certificates. | Security Council | KMS, libsodium, secp256k1, BLS | Cryptographic primitives |
| `/packages/solvers` | LP/MILP/CP-SAT interfaces, objective definitions, constraint serializers, solution validators. | Economic Council | OR-Tools, HiGHS | Optimization |
| `/packages/telemetry` | OpenTelemetry semantic conventions, log schemas, metric names, trace attribute contracts. | Observability Guild | OTEL SDK | Telemetry contracts |
| `/proto/kmos/v1` | Protobuf contracts for commands, events, queries, responses, workflow payloads, and topic payloads. | Architecture Council | buf, protoc | Wire contracts |
| `/contracts/constitutional` | Canonical constitution DSL files, amendment bundles, activation manifests, rollback manifests. | Constitutional Core Council | `packages/dsl`, validator | Constitutional source |
| `/contracts/governance` | Policy contracts, voting rules, quorum formulas, emergency override rules, audit policies. | Governance Council | Constitutional contracts | Governance rules |
| `/contracts/formal` | TLA+, PlusCal, Alloy, SMT-LIB, proof obligations, model-check configurations. | Formal Methods Guild | Apalache, TLC, Z3 | Formal verification |
| `/governance` | Proposal templates, committee rosters, authority matrices, review procedures, meeting records. | Governance Council | Identity graph, audit log | Governance operations |
| `/simulation` | Scenario definitions, agent models, population generators, Monte Carlo configs, replay fixtures. | Simulation Council | Simulation runner | Simulation assets |
| `/economics` | Allocation models, resource catalogs, pricing constraints, budget policies, incentive functions. | Economic Council | Solvers, lakehouse | Economics |
| `/identity` | DID method definitions, credential schemas, delegation policies, reputation algorithms. | Identity Council | W3C DID/VC, Neo4j | Identity |
| `/knowledge` | OSL ontology, belief schemas, contradiction rules, MCC/RBP policies, evidence normalization. | Knowledge Council | Neo4j, vector DB | Knowledge |
| `/evolution` | Fitness catalogs, Wardley maps, capability migrations, selection policies, adaptation packages. | Evolution Council | Simulation, governance | Evolution |
| `/resilience` | Failure taxonomy, incident playbooks, rollback plans, checkpoint catalogs, recovery drills. | Resilience Council | Observability, Temporal | Resilience |
| `/telemetry` | Metrics, traces, logs, exemplars, SLIs, SLOs, alert rules, dashboard JSON. | Observability Guild | Prometheus, Grafana, Jaeger | Observability |
| `/observability` | Collector configs, sampling policies, retention policies, dashboard deployments. | Observability Guild | OTEL, Prometheus | Runtime observation |
| `/platform` | Platform services, API gateways, service mesh config, identity-aware proxy config. | Platform SRE | Kubernetes, Istio | Platform runtime |
| `/infrastructure` | Terraform, Helm charts, Kustomize overlays, operators, CRDs, network policies. | Platform SRE | Kubernetes, cloud provider | Infrastructure |
| `/deployments/dev` | Single-region development deployment values and seed identities. | Platform SRE | Helm, Kustomize | Development runtime |
| `/deployments/staging` | Multi-zone staging deployment with replay fixtures and model-check hooks. | Platform SRE | Helm, Kafka, Temporal | Staging runtime |
| `/deployments/prod` | Multi-region active-active production deployment, failover config, sealed secrets. | Platform SRE | GitOps, Vault, Istio | Production runtime |
| `/tests/unit` | Parser, service, invariant, algorithm, and serialization unit tests. | Owning teams | Vitest, Go test, Rust test | Unit verification |
| `/tests/integration` | Service-to-service tests for command/event/query workflows. | QA Guild | Docker Compose, Testcontainers | Integration verification |
| `/tests/formal` | Model-check fixtures, counterexample regression tests, proof obligation checks. | Formal Methods Guild | TLC, Apalache, Z3 | Formal verification |
| `/tests/simulation` | Monte Carlo regression runs, scenario snapshots, model calibration tests. | Simulation Council | Ray, lakehouse | Simulation verification |
| `/docs/kmos` | Implementation specifications, operational contracts, diagrams, runbooks, roadmap. | Architecture Council | Source documents | Architecture records |
| `/rfcs` | Versioned decision records for architecture, governance, economics, identity, knowledge, resilience, and evolution. | Architecture Council | Governance engine | RFC lifecycle |

Dependency rules:

1. Layer 0 packages depend only on cryptography, formal methods, storage primitives, and telemetry contracts.
2. Layer 1 identity depends on Layer 0 constitutional rules and emits authority facts consumed by Layers 2 through 8.
3. Layer 2 governance depends on Layers 0 and 1 and may command Layers 3 through 8 through audited workflows.
4. Layers 3 through 8 never mutate constitutional source directly; they create evidence, simulations, and proposals.
5. All cross-layer state changes use protobuf commands and Kafka events with an audit envelope.

