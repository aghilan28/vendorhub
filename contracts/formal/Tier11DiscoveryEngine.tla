------------------------------ MODULE Tier11DiscoveryEngine ------------------------------
EXTENDS Naturals, Sequences

CONSTANTS Hypotheses
VARIABLES state, plans, runs, observations, validations

States == {"generated","planned","scheduled","running","validated","rejected","archived"}

Init ==
  /\ state \in [Hypotheses -> "generated"]
  /\ plans = {}
  /\ runs = {}
  /\ observations = {}
  /\ validations = {}

Plan(h) == /\ h \in Hypotheses /\ state[h] = "generated" /\ state' = [state EXCEPT ![h] = "planned"] /\ plans' = plans \cup {h} /\ UNCHANGED <<runs, observations, validations>>
Schedule(h) == /\ h \in plans /\ state[h] = "planned" /\ state' = [state EXCEPT ![h] = "scheduled"] /\ UNCHANGED <<plans, runs, observations, validations>>
Run(h) == /\ state[h] = "scheduled" /\ state' = [state EXCEPT ![h] = "running"] /\ runs' = runs \cup {h} /\ UNCHANGED <<plans, observations, validations>>
Observe(h) == /\ h \in runs /\ state[h] = "running" /\ observations' = observations \cup {h} /\ UNCHANGED <<state, plans, runs, validations>>
Validate(h) == /\ h \in observations /\ state[h] = "running" /\ state' = [state EXCEPT ![h] = "validated"] /\ validations' = validations \cup {h} /\ UNCHANGED <<plans, runs, observations>>
Reject(h) == /\ h \in runs /\ state[h] = "running" /\ state' = [state EXCEPT ![h] = "rejected"] /\ UNCHANGED <<plans, runs, observations, validations>>

Next == \E h \in Hypotheses: Plan(h) \/ Schedule(h) \/ Run(h) \/ Observe(h) \/ Validate(h) \/ Reject(h)

TypeInvariant == /\ state \in [Hypotheses -> States] /\ plans \subseteq Hypotheses /\ runs \subseteq Hypotheses /\ observations \subseteq Hypotheses /\ validations \subseteq Hypotheses
NoValidationWithoutObservation == validations \subseteq observations
NoRunWithoutPlan == runs \subseteq plans

Spec == Init /\ [][Next]_<<state, plans, runs, observations, validations>>
Safety == TypeInvariant /\ NoValidationWithoutObservation /\ NoRunWithoutPlan
Liveness == \A h \in Hypotheses: state[h] = "generated" ~> (state[h] = "validated" \/ state[h] = "rejected")
================================================================================
