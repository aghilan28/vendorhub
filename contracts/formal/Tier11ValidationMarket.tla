---------------------------- MODULE Tier11ValidationMarket ----------------------------
EXTENDS Naturals, Sequences

CONSTANTS Claims, Markets, Participants

States == {"CLAIM_SUBMITTED","MARKET_CREATED","FORECASTING","REPLICATION_RUNNING","EVIDENCE_COLLECTION","SETTLEMENT","REPUTATION_UPDATE","ARCHIVED"}

VARIABLES claimState, marketState, forecasts, settlements, reputations

Init ==
  /\ claimState \in [Claims -> "CLAIM_SUBMITTED"]
  /\ marketState \in [Markets -> "MARKET_CREATED"]
  /\ forecasts = {}
  /\ settlements = {}
  /\ reputations \in [Participants -> 0..100]

Allowed(from, to) ==
  \/ /\ from = "CLAIM_SUBMITTED" /\ to = "MARKET_CREATED"
  \/ /\ from = "MARKET_CREATED" /\ to = "FORECASTING"
  \/ /\ from = "FORECASTING" /\ to = "REPLICATION_RUNNING"
  \/ /\ from = "REPLICATION_RUNNING" /\ to = "EVIDENCE_COLLECTION"
  \/ /\ from = "EVIDENCE_COLLECTION" /\ to = "SETTLEMENT"
  \/ /\ from = "SETTLEMENT" /\ to = "REPUTATION_UPDATE"
  \/ /\ from = "REPUTATION_UPDATE" /\ to = "ARCHIVED"

AdvanceClaim(c, to) ==
  /\ c \in Claims
  /\ Allowed(claimState[c], to)
  /\ claimState' = [claimState EXCEPT ![c] = to]
  /\ UNCHANGED <<marketState, forecasts, settlements, reputations>>

SubmitForecast(m, p) ==
  /\ m \in Markets /\ p \in Participants
  /\ marketState[m] = "FORECASTING"
  /\ forecasts' = forecasts \cup {<<m, p>>}
  /\ UNCHANGED <<claimState, marketState, settlements, reputations>>

Settle(m) ==
  /\ m \in Markets
  /\ marketState[m] = "SETTLEMENT"
  /\ \E p \in Participants: <<m, p>> \in forecasts
  /\ settlements' = settlements \cup {m}
  /\ UNCHANGED <<claimState, marketState, forecasts, reputations>>

AdjustReputation(p, score) ==
  /\ p \in Participants /\ score \in 0..100
  /\ reputations' = [reputations EXCEPT ![p] = score]
  /\ UNCHANGED <<claimState, marketState, forecasts, settlements>>

Next ==
  \/ \E c \in Claims, to \in States: AdvanceClaim(c, to)
  \/ \E m \in Markets, p \in Participants: SubmitForecast(m, p)
  \/ \E m \in Markets: Settle(m)
  \/ \E p \in Participants, score \in 0..100: AdjustReputation(p, score)

TypeInvariant ==
  /\ claimState \in [Claims -> States]
  /\ marketState \in [Markets -> States]
  /\ forecasts \subseteq Markets \X Participants
  /\ settlements \subseteq Markets
  /\ reputations \in [Participants -> 0..100]

NoSettlementWithoutForecast == \A m \in settlements: \E p \in Participants: <<m, p>> \in forecasts
ReputationBounded == \A p \in Participants: reputations[p] >= 0 /\ reputations[p] <= 100
ArchivedTerminal == \A c \in Claims: claimState[c] = "ARCHIVED" => claimState'[c] = "ARCHIVED"

Spec == Init /\ [][Next]_<<claimState, marketState, forecasts, settlements, reputations>>
Safety == TypeInvariant /\ NoSettlementWithoutForecast /\ ReputationBounded
Liveness == \A c \in Claims: claimState[c] = "CLAIM_SUBMITTED" ~> claimState[c] = "ARCHIVED"
================================================================================
