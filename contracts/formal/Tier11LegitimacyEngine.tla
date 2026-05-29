------------------------------ MODULE Tier11LegitimacyEngine ------------------------------
EXTENDS Naturals

CONSTANTS Scopes
VARIABLES stress, trigger, actuations

Triggers == {"stable","stress_watch","adaptive_policy_review","redistribution_required"}

Init ==
  /\ stress \in [Scopes -> 0..100]
  /\ trigger \in [Scopes -> "stable"]
  /\ actuations = {}

Compute(s, value) ==
  /\ s \in Scopes /\ value \in 0..100
  /\ stress' = [stress EXCEPT ![s] = value]
  /\ trigger' = [trigger EXCEPT ![s] =
      IF value >= 78 THEN "redistribution_required"
      ELSE IF value >= 62 THEN "adaptive_policy_review"
      ELSE IF value >= 45 THEN "stress_watch"
      ELSE "stable"]
  /\ UNCHANGED actuations

Actuate(s) ==
  /\ s \in Scopes
  /\ trigger[s] \in {"adaptive_policy_review","redistribution_required"}
  /\ actuations' = actuations \cup {s}
  /\ UNCHANGED <<stress, trigger>>

Next == \E s \in Scopes, value \in 0..100: Compute(s, value) \/ Actuate(s)

TypeInvariant == /\ stress \in [Scopes -> 0..100] /\ trigger \in [Scopes -> Triggers] /\ actuations \subseteq Scopes
NoStableActuation == \A s \in actuations: trigger[s] \in {"adaptive_policy_review","redistribution_required"}
RedistributionAboveThreshold == \A s \in Scopes: trigger[s] = "redistribution_required" => stress[s] >= 78

Spec == Init /\ [][Next]_<<stress, trigger, actuations>>
Safety == TypeInvariant /\ NoStableActuation /\ RedistributionAboveThreshold
Liveness == \A s \in Scopes: trigger[s] = "redistribution_required" ~> s \in actuations
================================================================================
