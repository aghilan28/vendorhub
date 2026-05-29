------------------------- MODULE Tier11ConstitutionalCompiler -------------------------
EXTENDS Naturals, Sequences

CONSTANTS Policies
VARIABLES state, ast, compiled, proofs, deployed

States == {"draft","parsed","validated","compiled","verified","deployed","revoked"}

Init ==
  /\ state \in [Policies -> "draft"]
  /\ ast = {}
  /\ compiled = {}
  /\ proofs = {}
  /\ deployed = {}

Parse(p) == /\ p \in Policies /\ state[p] = "draft" /\ state' = [state EXCEPT ![p] = "parsed"] /\ ast' = ast \cup {p} /\ UNCHANGED <<compiled, proofs, deployed>>
Validate(p) == /\ p \in ast /\ state[p] = "parsed" /\ state' = [state EXCEPT ![p] = "validated"] /\ UNCHANGED <<ast, compiled, proofs, deployed>>
Compile(p) == /\ state[p] = "validated" /\ state' = [state EXCEPT ![p] = "compiled"] /\ compiled' = compiled \cup {p} /\ UNCHANGED <<ast, proofs, deployed>>
Verify(p) == /\ p \in compiled /\ state[p] = "compiled" /\ state' = [state EXCEPT ![p] = "verified"] /\ proofs' = proofs \cup {p} /\ UNCHANGED <<ast, compiled, deployed>>
Deploy(p) == /\ p \in proofs /\ state[p] = "verified" /\ state' = [state EXCEPT ![p] = "deployed"] /\ deployed' = deployed \cup {p} /\ UNCHANGED <<ast, compiled, proofs>>
Revoke(p) == /\ p \in deployed /\ state[p] = "deployed" /\ state' = [state EXCEPT ![p] = "revoked"] /\ deployed' = deployed \ {p} /\ UNCHANGED <<ast, compiled, proofs>>

Next == \E p \in Policies: Parse(p) \/ Validate(p) \/ Compile(p) \/ Verify(p) \/ Deploy(p) \/ Revoke(p)

TypeInvariant == /\ state \in [Policies -> States] /\ ast \subseteq Policies /\ compiled \subseteq Policies /\ proofs \subseteq Policies /\ deployed \subseteq Policies
NoDeployWithoutProof == deployed \subseteq proofs
NoCompileWithoutAst == compiled \subseteq ast
RevokedNotDeployed == \A p \in Policies: state[p] = "revoked" => p \notin deployed

Spec == Init /\ [][Next]_<<state, ast, compiled, proofs, deployed>>
Safety == TypeInvariant /\ NoDeployWithoutProof /\ NoCompileWithoutAst /\ RevokedNotDeployed
Liveness == \A p \in Policies: state[p] = "draft" ~> (state[p] = "deployed" \/ state[p] = "revoked")
================================================================================
