module Tier15Traceability

sig Concept {}
sig DomainModel {}
sig StorageSchema {}
sig GraphModel {}
sig VectorModel {}
sig Service {}
sig Workflow {}
sig Api {}
sig EventStream {}
sig SecurityLayer {}
sig Metric {}
sig Dashboard {}
sig VerificationRule {}
sig TestSuite {}

sig TraceabilityRow {
  concept: one Concept,
  domain: one DomainModel,
  storage: one StorageSchema,
  graph: one GraphModel,
  vector: one VectorModel,
  service: one Service,
  workflow: one Workflow,
  api: one Api,
  event: one EventStream,
  security: one SecurityLayer,
  metrics: some Metric,
  dashboard: one Dashboard,
  rule: one VerificationRule,
  tests: one TestSuite
}

fact CompleteMapping {
  all c: Concept | one r: TraceabilityRow | r.concept = c
}
