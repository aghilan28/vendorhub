---- MODULE Tier10InstitutionLifecycle ----
EXTENDS Naturals, FiniteSets

CONSTANTS Institutions

VARIABLES state, fitness, entropy, legitimacy, adaptability

States == {"birth","growth","stagnation","fragmentation","collapse","replacement"}

Init ==
  /\ state \in [Institutions -> {"birth"}]
  /\ fitness \in [Institutions -> 0..100]
  /\ entropy \in [Institutions -> 0..100]
  /\ legitimacy \in [Institutions -> 0..100]
  /\ adaptability \in [Institutions -> 0..100]

Transition(i) ==
  \/ /\ state[i] = "birth" /\ legitimacy[i] >= 45 /\ fitness[i] >= 45
     /\ state' = [state EXCEPT ![i] = "growth"]
  \/ /\ state[i] = "growth" /\ (adaptability[i] < 35 \/ entropy[i] > 72)
     /\ state' = [state EXCEPT ![i] = "stagnation"]
  \/ /\ state[i] = "stagnation" /\ entropy[i] >= 82 /\ legitimacy[i] < 45
     /\ state' = [state EXCEPT ![i] = "fragmentation"]
  \/ /\ state[i] = "fragmentation" /\ fitness[i] < 25 /\ legitimacy[i] < 25
     /\ state' = [state EXCEPT ![i] = "collapse"]
  \/ /\ state[i] = "collapse" /\ adaptability[i] >= 55 /\ legitimacy[i] >= 50
     /\ state' = [state EXCEPT ![i] = "replacement"]
  \/ /\ state[i] = "replacement" /\ fitness[i] >= 50
     /\ state' = [state EXCEPT ![i] = "growth"]

Next == \E i \in Institutions: Transition(i) /\ UNCHANGED <<fitness, entropy, legitimacy, adaptability>>

TypeOK == state \in [Institutions -> States]
NoCollapseFromGrowth == \A i \in Institutions: state[i] = "growth" => entropy[i] <= 100

Spec == Init /\ [][Next]_<<state, fitness, entropy, legitimacy, adaptability>>
THEOREM Spec => []TypeOK
====
