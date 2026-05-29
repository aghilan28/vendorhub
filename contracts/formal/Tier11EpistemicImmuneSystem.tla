--------------------------- MODULE Tier11EpistemicImmuneSystem ---------------------------
EXTENDS Naturals

CONSTANTS Claims
VARIABLES truth, contradictions, quarantines, verifications

TruthStates == {"unverified","supported","contested","contradicted","quarantined","deprecated"}

Init ==
  /\ truth \in [Claims -> "unverified"]
  /\ contradictions = {}
  /\ quarantines = {}
  /\ verifications = {}

Verify(c) == /\ c \in Claims /\ truth[c] \in {"unverified","contested"} /\ verifications' = verifications \cup {c} /\ truth' = [truth EXCEPT ![c] = "supported"] /\ UNCHANGED <<contradictions, quarantines>>
DetectContradiction(c) == /\ c \in Claims /\ contradictions' = contradictions \cup {c} /\ truth' = [truth EXCEPT ![c] = "contradicted"] /\ UNCHANGED <<quarantines, verifications>>
Quarantine(c) == /\ c \in contradictions /\ truth[c] = "contradicted" /\ quarantines' = quarantines \cup {c} /\ truth' = [truth EXCEPT ![c] = "quarantined"] /\ UNCHANGED <<contradictions, verifications>>
Release(c) == /\ c \in quarantines /\ c \in verifications /\ truth' = [truth EXCEPT ![c] = "supported"] /\ quarantines' = quarantines \ {c} /\ UNCHANGED <<contradictions, verifications>>
Deprecate(c) == /\ c \in quarantines /\ truth' = [truth EXCEPT ![c] = "deprecated"] /\ UNCHANGED <<contradictions, quarantines, verifications>>

Next == \E c \in Claims: Verify(c) \/ DetectContradiction(c) \/ Quarantine(c) \/ Release(c) \/ Deprecate(c)

TypeInvariant == /\ truth \in [Claims -> TruthStates] /\ contradictions \subseteq Claims /\ quarantines \subseteq Claims /\ verifications \subseteq Claims
ContradictedClaimsQuarantined == \A c \in contradictions: truth[c] = "contradicted" \/ truth[c] = "quarantined" \/ truth[c] = "deprecated" \/ truth[c] = "supported"
NoReleaseWithoutVerification == \A c \in Claims: c \notin quarantines /\ truth[c] = "supported" => c \in verifications

Spec == Init /\ [][Next]_<<truth, contradictions, quarantines, verifications>>
Safety == TypeInvariant /\ ContradictedClaimsQuarantined /\ NoReleaseWithoutVerification
Liveness == \A c \in contradictions: c \in quarantines \/ truth[c] = "deprecated" \/ truth[c] = "supported"
================================================================================
