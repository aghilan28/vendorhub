---- MODULE Tier15KnowledgeLifecycle ----
EXTENDS Naturals, Sequences

States == {"DRAFT", "HYPOTHESIZED", "VALIDATED", "VERIFIED", "DRIFTED", "RUPTURED", "HEALED", "ARCHIVED", "DEPRECATED"}
Events == {"KnowledgeCreated", "KnowledgeValidated", "KnowledgeVerified", "KnowledgeDrifted", "KnowledgeRuptured", "KnowledgeHealed", "KnowledgeArchived", "ThreatDetected", "HypothesisGenerated", "DiscoveryValidated"}

VARIABLE state, log

Init == /\ state = "DRAFT"
        /\ log = <<>>

Allowed(from, to) ==
  \/ /\ from = "DRAFT" /\ to \in {"HYPOTHESIZED", "DEPRECATED"}
  \/ /\ from = "HYPOTHESIZED" /\ to \in {"VALIDATED", "RUPTURED", "DEPRECATED"}
  \/ /\ from = "VALIDATED" /\ to \in {"VERIFIED", "DRIFTED", "RUPTURED"}
  \/ /\ from = "VERIFIED" /\ to \in {"DRIFTED", "ARCHIVED", "DEPRECATED"}
  \/ /\ from = "DRIFTED" /\ to \in {"HEALED", "RUPTURED", "ARCHIVED"}
  \/ /\ from = "RUPTURED" /\ to \in {"HEALED", "DEPRECATED"}
  \/ /\ from = "HEALED" /\ to \in {"VALIDATED", "VERIFIED", "ARCHIVED"}
  \/ /\ from = "ARCHIVED" /\ to = "DEPRECATED"

Next == \E to \in States:
  /\ Allowed(state, to)
  /\ state' = to
  /\ log' = Append(log, to)

ImmutableEvents == \A i \in 1..Len(log): log[i] \in States
NoResurrection == state = "DEPRECATED" => UNCHANGED state

Spec == Init /\ [][Next]_<<state, log>>
====
