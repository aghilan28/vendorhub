---- MODULE Tier14KnowledgeInvariants ----
EXTENDS Naturals, Sequences

VARIABLES provenance, confidence, verificationState

EnvelopeValid ==
  Len(provenance) > 0 /\ confidence >= 0 /\ confidence <= 1 /\ verificationState # "failed"

TraceabilityComplete(row) ==
  row.domainEntity # "" /\ row.aggregate # "" /\ row.service # "" /\ row.workflow # "" /\
  row.event # "" /\ row.api # "" /\ row.storageSchema # "" /\ row.graphSchema # "" /\
  row.vectorRepresentation # "" /\ Len(row.metrics) > 0 /\ Len(row.verificationRules) > 0

====
