---- MODULE KMOSConstitution ----
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS
  Amendments,
  Versions,
  Actors,
  ThetaCapture

VARIABLES
  state,
  activeVersion,
  proofPassed,
  simulationPassed,
  rollbackAvailable,
  approved,
  controlShare

States ==
  {"DRAFT","SUBMITTED","EVIDENCE_REVIEW","FORMAL_VALIDATION",
   "SIMULATION_VALIDATION","DELIBERATION","VOTING","APPROVED",
   "SCHEDULED","ACTIVATING","ACTIVE","REJECTED",
   "ROLLBACK_PENDING","ROLLED_BACK","SUPERSEDED"}

Init ==
  /\ state \in [Amendments -> {"DRAFT"}]
  /\ activeVersion \in Versions
  /\ proofPassed \in [Amendments -> FALSE]
  /\ simulationPassed \in [Amendments -> FALSE]
  /\ rollbackAvailable \in [Amendments -> FALSE]
  /\ approved \in [Amendments -> FALSE]
  /\ controlShare \in [Actors -> 0..100]

Submit(a) ==
  /\ state[a] = "DRAFT"
  /\ state' = [state EXCEPT ![a] = "SUBMITTED"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

EvidenceAccept(a) ==
  /\ state[a] = "SUBMITTED"
  /\ state' = [state EXCEPT ![a] = "FORMAL_VALIDATION"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

PassProof(a) ==
  /\ state[a] = "FORMAL_VALIDATION"
  /\ proofPassed' = [proofPassed EXCEPT ![a] = TRUE]
  /\ rollbackAvailable' = [rollbackAvailable EXCEPT ![a] = TRUE]
  /\ state' = [state EXCEPT ![a] = "SIMULATION_VALIDATION"]
  /\ UNCHANGED <<activeVersion, simulationPassed, approved, controlShare>>

PassSimulation(a) ==
  /\ state[a] = "SIMULATION_VALIDATION"
  /\ simulationPassed' = [simulationPassed EXCEPT ![a] = TRUE]
  /\ state' = [state EXCEPT ![a] = "DELIBERATION"]
  /\ UNCHANGED <<activeVersion, proofPassed, rollbackAvailable, approved, controlShare>>

Approve(a) ==
  /\ state[a] = "VOTING"
  /\ proofPassed[a]
  /\ simulationPassed[a]
  /\ rollbackAvailable[a]
  /\ \A actor \in Actors: controlShare[actor] < ThetaCapture
  /\ approved' = [approved EXCEPT ![a] = TRUE]
  /\ state' = [state EXCEPT ![a] = "APPROVED"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, controlShare>>

Schedule(a) ==
  /\ state[a] = "APPROVED"
  /\ state' = [state EXCEPT ![a] = "SCHEDULED"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

Activate(a, v) ==
  /\ state[a] = "SCHEDULED"
  /\ approved[a]
  /\ proofPassed[a]
  /\ simulationPassed[a]
  /\ rollbackAvailable[a]
  /\ v \in Versions
  /\ activeVersion' = v
  /\ state' = [state EXCEPT ![a] = "ACTIVE"]
  /\ UNCHANGED <<proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

Rollback(a) ==
  /\ state[a] \in {"ACTIVATING","ACTIVE","ROLLBACK_PENDING"}
  /\ rollbackAvailable[a]
  /\ state' = [state EXCEPT ![a] = "ROLLED_BACK"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

Reject(a) ==
  /\ state[a] \in {"SUBMITTED","FORMAL_VALIDATION","SIMULATION_VALIDATION","VOTING"}
  /\ state' = [state EXCEPT ![a] = "REJECTED"]
  /\ UNCHANGED <<activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

Next ==
  \E a \in Amendments:
    Submit(a) \/ EvidenceAccept(a) \/ PassProof(a) \/ PassSimulation(a) \/
    Approve(a) \/ Schedule(a) \/ Reject(a) \/ Rollback(a) \/
    \E v \in Versions: Activate(a, v)

TypeOK ==
  /\ state \in [Amendments -> States]
  /\ activeVersion \in Versions
  /\ proofPassed \in [Amendments -> BOOLEAN]
  /\ simulationPassed \in [Amendments -> BOOLEAN]
  /\ rollbackAvailable \in [Amendments -> BOOLEAN]
  /\ approved \in [Amendments -> BOOLEAN]
  /\ controlShare \in [Actors -> 0..100]

NoActivationWithoutProof ==
  \A a \in Amendments:
    state[a] = "ACTIVE" => proofPassed[a] /\ simulationPassed[a] /\ rollbackAvailable[a] /\ approved[a]

CaptureResistance ==
  \A actor \in Actors: controlShare[actor] < ThetaCapture

RollbackAvailable ==
  \A a \in Amendments:
    state[a] = "ACTIVE" => rollbackAvailable[a]

Safety ==
  TypeOK /\ NoActivationWithoutProof /\ CaptureResistance /\ RollbackAvailable

Spec == Init /\ [][Next]_<<state, activeVersion, proofPassed, simulationPassed, rollbackAvailable, approved, controlShare>>

THEOREM Spec => []Safety
====

