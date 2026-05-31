# EC-6 Phase 7 — Operational Intelligence Certification

**Source:** `lib/marketplace-operations/intelligence.ts`, `lib/marketplace-operations/operations-center.ts`, `lib/autonomous-operations/incident-intelligence.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Operational alerts | ✅ REAL | `generateAlerts(data)` — threshold-based, severity + suggested action |
| Marketplace alerts | ✅ REAL | operations-center alerts across 7 domains |
| Incident alerts | ✅ REAL | open-incident alerts; autonomous incident-intelligence anomaly scoring |
| Trust alerts | ✅ REAL | refund-fraud + suspended-seller alerts |
| Dispute alerts | ✅ REAL | dispute-backlog alert (threshold > 20 open) |
| Intervention recommendations | ✅ REAL | each `OperationalRisk` carries a `recommendation` (corrective action) |
| Operational recommendations | ✅ REAL | `detectOperationalRisks` (7 types) + `generateRecommendations` ranked by priority |

## Risk types (7)
support_spike · dispute_surge · fulfillment_degradation · seller_risk_cluster · customer_churn_wave · refund_fraud_pattern · incident_precursor.

## Executed evidence
- `marketplace-operations.test.ts` (49): risk detection, forecasts, recommendations, KPIs, alerts, full snapshot.
- `ec6-operations-scale.test.ts`: unified operations snapshot — overallHealth bounded, 7 domain health scores, ≥8 KPIs, alerts array.

**Status: PASS.**
