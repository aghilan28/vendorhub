# VENDORHUB Phase 11 Payments, Ledger, Settlement, and Marketplace Economics

Internal Financial Infrastructure, Settlement, and Marketplace Economics Constitution for VENDORHUB

Status: locked baseline before payment-service, ledger-service, settlement-service, payout-service, refund-service, and finance-admin implementation  
Depends on: Phase 0-10 constitutions  
Scope: payment orchestration, immutable ledger, double-entry accounting, split settlements, seller/rider payouts, commissions, refunds, disputes, webhook orchestration, idempotency, reconciliation, fraud safeguards, realtime transaction sync, financial analytics, tax/compliance, recovery, database schema, observability, frontend financial UX, engineering governance, testing, AI-assisted financial engineering workflow  
Non-goal: generic payment gateway integration guide or mutable balance shortcut

---

## 0. Financial Lock

VENDORHUB finance is the economic control system of the marketplace. It does not merely accept payments. It records obligations, protects money movement, coordinates multi-party settlement, explains every rupee, and preserves trust between buyers, sellers, riders, operations, and the platform.

The central financial truth:

```txt
VENDORHUB money movement is immutable, idempotent, reconcilable, auditable economic orchestration.
```

Every financial decision must account for:

- buyer charge integrity
- gateway state
- order state
- ledger balance
- seller allocation
- rider allocation
- platform commission
- tax treatment
- refund eligibility
- dispute evidence
- payout eligibility
- reconciliation status
- fraud risk
- auditability
- operational visibility

No VENDORHUB service may treat gateway status, frontend state, or mutable account balances as final financial truth. The immutable ledger and reconciliation system are the source of financial correctness.

---

## 1. Complete Financial Philosophy of VENDORHUB

### 1.1 What Money Flow Means in VENDORHUB

Money flow in VENDORHUB is the movement of economic obligation across parties. A buyer payment creates a platform liability. Order fulfillment converts that liability into seller payable, rider payable, platform revenue, taxes, and potential refund exposure. Payouts reduce payable liabilities. Refunds reverse economic claims. Disputes suspend certainty until evidence resolves the obligation.

Payments are operational infrastructure because order state, seller trust, rider earnings, refund timing, and support workflows depend on correct financial state. A payment system that only says "paid" is insufficient for a marketplace. VENDORHUB must know what was authorized, captured, allocated, held, reversed, paid out, disputed, reconciled, and audited.

Ledgers are the source of truth because gateway records are external observations, not complete marketplace economics. Gateways know charge and refund facts. VENDORHUB must know buyer obligation, seller entitlement, rider earnings, commission, tax, dispute hold, payout batch, and reconciliation evidence.

Marketplaces require immutable economic systems because money state must be replayable. If finance data can be overwritten, support cannot explain outcomes, reconciliation cannot prove correctness, and fraud or bugs can hide in mutation history.

Split settlements require orchestration because one buyer payment becomes multiple economic movements. Seller earnings, rider earnings, platform fees, taxes, promotions, refunds, disputes, and payout timing are related but not identical.

Financial consistency is trust. A buyer trusts VENDORHUB when charges and refunds are predictable. A seller trusts VENDORHUB when settlement math is transparent. A rider trusts VENDORHUB when earnings are reliable. Operations trusts VENDORHUB when every mismatch has an owner and recovery path.

Realtime transaction visibility matters because financial uncertainty is stressful. Buyers need to know whether payment succeeded. Sellers need to know whether an order is financially valid. Riders need payout visibility. Finance operations need live anomaly signals before settlement drift expands.

Financial observability is critical because payment systems are distributed and asynchronous. API responses, webhooks, bank settlements, internal ledgers, and frontend state can arrive in different orders. Observability makes disagreement visible.

### 1.2 Marketplace Economics Philosophy

VENDORHUB economics must optimize liquidity while preserving correctness. Revenue is not only GMV. Revenue is reconciled commission, less refunds, chargebacks, incentives, taxes, gateway fees, and payout obligations. The platform must never confuse transaction volume with economic health.

### 1.3 Settlement Philosophy

Settlement is not "send money later." Settlement is the controlled release of liabilities after eligibility, risk checks, order completion, refund windows, compliance requirements, and reconciliation evidence.

### 1.4 Reconciliation Philosophy

Reconciliation is the daily proof that internal truth and external records agree. It must be automated, explainable, exception-driven, and audit-ready. Every unreconciled item is either timing difference, known exception, or defect.

### 1.5 Refund Philosophy

Refunds are trust repairs. They must be fast when policy is clear, controlled when abuse risk exists, and ledger-correct in every case. A refund is not only a gateway reversal. It is also a reversal of seller payable, commission recognition, tax records, incentives, and dispute exposure.

### 1.6 Auditability Philosophy

Every financial event must answer:

- what happened?
- when did it happen?
- who or what triggered it?
- which idempotency key protected it?
- which gateway object confirms it?
- which ledger entries were posted?
- which reconciliation job validated it?
- what changed for each party?

### 1.7 Financial Governance Principles

- Ledger entries are append-only.
- Financial state machines are explicit and versioned.
- Gateway webhooks are at-least-once observations and must be idempotent.
- Every payment/refund/payout request has a logical idempotency key.
- No payout occurs without ledger eligibility.
- No refund occurs without policy validation and ledger adjustment.
- No finance logic lives only in frontend code.
- Provider-specific states are mapped into VENDORHUB canonical states.
- Reconciliation exceptions are operational work, not logs to ignore.

---

## 2. Complete Payment Architecture

VENDORHUB payment architecture uses provider adapters behind canonical financial contracts. Stripe, Razorpay, and Cash on Delivery are payment rails. VENDORHUB owns the payment state machine, ledger posting, order coordination, idempotency, and reconciliation.

### 2.1 Payment Components

Services:

- `payment-service`: creates payment intents/orders, confirms provider state, captures payments, manages retries
- `ledger-service`: posts immutable accounting entries
- `order-service`: consumes canonical payment state
- `webhook-service`: verifies, stores, deduplicates, and dispatches provider events
- `reconciliation-service`: compares gateway, bank, payout, refund, and ledger records
- `finance-admin`: exposes operational review, replay, and audit surfaces

Provider adapters:

- Stripe adapter
- Razorpay adapter
- Cash on Delivery adapter

Gateway abstraction:

- `createPayment`
- `authorizePayment`
- `capturePayment`
- `cancelAuthorization`
- `refundPayment`
- `fetchPayment`
- `fetchRefund`
- `verifyWebhook`
- `normalizeEvent`

The gateway abstraction must not hide provider limitations. It should normalize common behavior and expose capability flags:

- supports manual authorization/capture
- supports partial capture
- supports partial refund
- supports idempotent refund requests
- supports dispute events
- supports settlement exports
- supports split transfer primitives

### 2.2 Provider Strategy

Stripe:

- preferred where Stripe account/payment method coverage is available
- canonical mapping through PaymentIntent-style lifecycle
- webhook-confirmed success is treated as stronger than browser redirect state

Razorpay:

- preferred for India rails where UPI/cards/netbanking/wallet support is required
- canonical mapping through order/payment/capture/refund/webhook lifecycle
- settlements and refunds must be reconciled against Razorpay reports

Cash on Delivery:

- represented as a payment rail with no online authorization
- creates receivable and collection obligations
- requires rider/seller collection confirmation, cash deposit tracking, and variance reconciliation
- cannot unlock the same trust assumptions as prepaid payment

Payment-provider failover:

- failover only before a payment is authorized/captured
- never retry a failed provider call with a new provider without a new logical payment attempt
- never create two active charge attempts for one checkout without explicit cancellation/expiry of the first
- preserve provider attempt history for support and audit

### 2.3 Payment Flow

```txt
PAYMENT_INITIATED
↓
AUTHORIZED
↓
CAPTURED
↓
SETTLEMENT_PENDING
↓
SETTLED
↓
RECONCILED
```

### 2.4 Payment States

`PAYMENT_INITIATED`

- Operational meaning: VENDORHUB created a payment attempt and provider object or COD obligation.
- Frontend visibility: "Payment started" or provider checkout in progress.
- Backend coordination: order remains pending payment; inventory may be soft-reserved with expiry.
- Failure handling: expired attempts are closed; user may retry with new attempt id.
- Reconciliation implication: no captured money expected yet.

`AUTHORIZED`

- Operational meaning: provider has approved a hold or COD obligation has been accepted.
- Frontend visibility: "Payment authorized" only if useful; most buyers see processing/confirmation.
- Backend coordination: order may proceed to capture or fulfillment hold depending on rail.
- Failure handling: authorization expiry must release reservation and close order path.
- Reconciliation implication: authorized amount is not revenue and not seller payable.

`CAPTURED`

- Operational meaning: money was captured or COD collection was confirmed.
- Frontend visibility: "Payment successful."
- Backend coordination: order becomes financially valid; ledger posts buyer cash/receivable and platform liability.
- Failure handling: duplicate capture must be blocked by idempotency and provider status checks.
- Reconciliation implication: captured amount must appear in gateway records.

`SETTLEMENT_PENDING`

- Operational meaning: funds are captured but not fully settled/payout-eligible internally.
- Frontend visibility: buyer sees paid; seller sees earning pending eligibility.
- Backend coordination: split allocation and hold rules are computed.
- Failure handling: dispute/refund can place holds on allocations.
- Reconciliation implication: gateway settlement or bank settlement may be pending.

`SETTLED`

- Operational meaning: funds/allocations are eligible for payout or have reached platform settlement account.
- Frontend visibility: seller/rider sees amount moving toward payout.
- Backend coordination: payout engine can include eligible entries in batch.
- Failure handling: settlement mismatch creates reconciliation exception.
- Reconciliation implication: gateway settlement records must tie to internal transaction ids.

`RECONCILED`

- Operational meaning: internal ledger, provider records, settlement records, and payout/refund facts agree.
- Frontend visibility: not generally buyer-visible; seller/rider may see finalized payout line.
- Backend coordination: finance audit marks closed period or closed transaction.
- Failure handling: corrections require explicit adjustment entries.
- Reconciliation implication: item can be archived into audit trail.

---

## 3. Complete Ledger Architecture

VENDORHUB ledger is immutable, double-entry, append-only, and party-aware. It records economic truth independently from transient service state.

### 3.1 Ledger Types

Buyer ledger:

- charges
- refunds
- COD receivables
- dispute reversals

Seller ledger:

- gross order earning
- commission deduction
- promotion deduction/subsidy
- refund reversal
- payout payable
- payout completed

Rider ledger:

- delivery earning
- incentive
- penalty/adjustment
- COD collected
- cash deposit obligation
- payout completed

Commission ledger:

- platform commission earned
- commission reversal
- promotional fee adjustment
- tax on fees where applicable

Refund ledger:

- buyer refund liability
- provider refund execution
- seller earning reversal
- commission reversal
- tax adjustment

Payout ledger:

- payable created
- payout batch hold
- payout initiated
- payout completed
- payout failed reversal

### 3.2 Double-Entry Accounting

Every economic event posts balanced debit and credit entries.

Rules:

- total debits equal total credits per journal transaction
- entries are immutable after posting
- corrections are new reversing/adjusting entries
- every entry has currency, amount_minor, party, account, transaction id, and journal id
- no negative mutation of balances; balances are derived from entries

Why double-entry matters:

- buyer payment creates both cash/receivable and liability/revenue allocations
- payout reduces cash and payable liability
- refund reduces cash and reverses obligation
- dispute hold moves value into restricted accounts without losing trace

Mutable balances are dangerous because they hide causality. If a balance is overwritten, VENDORHUB cannot prove whether the change came from payment, refund, commission, payout, dispute, tax, fraud correction, or bug.

### 3.3 Ledger Accounts

Core accounts:

- cash_gateway_clearing
- cash_bank
- buyer_receivable_cod
- platform_escrow_liability
- seller_payable
- rider_payable
- platform_commission_revenue
- gateway_fee_expense
- tax_payable
- refund_liability
- dispute_hold_liability
- promotion_expense
- adjustment_clearing

### 3.4 Example Entries

Successful prepaid order of 1000.00 with 100.00 commission, 50.00 rider earning, 18.00 tax on platform fee:

| Account | Debit | Credit |
| --- | ---: | ---: |
| cash_gateway_clearing | 100000 | 0 |
| platform_escrow_liability | 0 | 100000 |
| platform_escrow_liability | 100000 | 0 |
| seller_payable | 0 | 83200 |
| rider_payable | 0 | 5000 |
| platform_commission_revenue | 0 | 10000 |
| tax_payable | 0 | 1800 |

Refund of 200.00 after seller allocation:

| Account | Debit | Credit |
| --- | ---: | ---: |
| refund_liability | 20000 | 0 |
| cash_gateway_clearing | 0 | 20000 |
| seller_payable | 16000 | 0 |
| platform_commission_revenue | 2000 | 0 |
| tax_payable | 360 | 0 |
| refund_liability | 0 | 18360 |

Seller payout of 832.00:

| Account | Debit | Credit |
| --- | ---: | ---: |
| seller_payable | 83200 | 0 |
| cash_bank | 0 | 83200 |

Commission deduction:

| Account | Debit | Credit |
| --- | ---: | ---: |
| platform_escrow_liability | 10000 | 0 |
| platform_commission_revenue | 0 | 10000 |

Delivery incentive of 20.00:

| Account | Debit | Credit |
| --- | ---: | ---: |
| promotion_expense | 2000 | 0 |
| rider_payable | 0 | 2000 |

Traceability:

- every example above is posted under a journal transaction
- each journal links to order, payment attempt, payout batch, refund, dispute, or adjustment
- replaying all entries reconstructs balances

---

## 4. Complete Split-Settlement Architecture

Split settlement turns one buyer payment into governed economic allocations.

### 4.1 Split Flow

```txt
Buyer Payment
↓
Platform Escrow
↓
Commission Deduction
↓
Seller Allocation
↓
Rider Allocation
↓
Settlement Scheduling
↓
Payout Execution
```

### 4.2 Split Stages

Buyer Payment:

- Calculation: captured amount, discounts, delivery fee, taxes, tips if supported.
- Timing: after gateway capture or COD collection confirmation.
- Observability: payment id, provider id, attempt id, amount, currency, capture time.
- Reconciliation: captured amount must match provider record.

Platform Escrow:

- Calculation: full captured amount enters clearing/escrow liability.
- Timing: immediately after capture ledger posting.
- Observability: escrow balance by order and settlement status.
- Reconciliation: gateway clearing must match sum of unreconciled captured payments less refunds/fees.

Commission Deduction:

- Calculation: commission rule version, category, seller plan, promotion, tax.
- Timing: after order financial validity and before seller payable finalization.
- Observability: rule id, commission basis, tax basis, discount treatment.
- Reconciliation: commission revenue must tie to order line allocation.

Seller Allocation:

- Calculation: line gross minus commission, seller-funded discount, refund hold, tax treatment.
- Timing: after fulfillment or configured settlement eligibility.
- Observability: seller earning line by order item.
- Reconciliation: seller payable equals sum of eligible allocations minus reversals and payouts.

Rider Allocation:

- Calculation: base delivery earning, distance, incentive, COD handling, penalty, tip if supported.
- Timing: after delivery completion or collection confirmation.
- Observability: delivery id, route, incentive rule, COD variance.
- Reconciliation: rider payable equals completed delivery earnings minus payout/adjustments.

Settlement Scheduling:

- Calculation: eligibility windows, risk holds, refund/dispute holds, minimum payout thresholds.
- Timing: scheduled batch windows.
- Observability: eligible amount, held amount, reason for hold, expected payout date.
- Reconciliation: scheduled amounts must tie to ledger payables.

Payout Execution:

- Calculation: batch amount less deductions/holds.
- Timing: payout batch run.
- Observability: payout id, bank reference, provider transfer id, status.
- Reconciliation: bank/provider payout record must match internal payout batch.

### 4.3 Commission Engine

Commission rules:

- category-based percentage
- fixed per-order fee
- seller plan override
- promotional reduced commission
- minimum commission cap/floor
- regional commission
- delivery-subsidy treatment
- tax-inclusive vs tax-exclusive basis

Dynamic commissions:

- allowed only through approved rule versions
- must include effective date and expiry
- cannot retroactively mutate posted ledger entries
- corrections require adjustment journal

Promotional fee logic:

- platform-funded discount books promotion expense
- seller-funded discount reduces seller gross
- shared discount splits according to campaign rule

Fairness constraints:

- sellers must see applicable commission rule before transactions
- commission changes must be versioned and auditable
- hidden per-seller commission overrides require admin approval and reason

---

## 5. Complete Payout Architecture

Payouts are governed releases of payable liabilities.

### 5.1 Payout States

```txt
ELIGIBLE
↓
PROCESSING
↓
INITIATED
↓
COMPLETED
↓
RECONCILED
```

`ELIGIBLE`

- Visibility: seller/rider sees available or upcoming payout amount.
- Reconciliation: amount equals ledger payable less holds.
- Recovery: ineligible if refund/dispute/compliance hold appears before batch lock.

`PROCESSING`

- Visibility: payout is being prepared.
- Reconciliation: entries are locked into a payout batch.
- Recovery: failed validation returns entries to eligible or held state.

`INITIATED`

- Visibility: payout sent to bank/provider.
- Reconciliation: provider/bank reference expected.
- Recovery: retry only with same payout idempotency key or new attempt under same payout batch.

`COMPLETED`

- Visibility: paid.
- Reconciliation: cash movement posted and provider confirms success.
- Recovery: later bank return creates reversal entry and support case.

`RECONCILED`

- Visibility: finalized.
- Reconciliation: internal payout, provider transfer, bank statement, and ledger entries agree.
- Recovery: only adjustment journal can correct.

### 5.2 Payout Engine

Scheduling:

- daily/weekly seller windows
- rider windows based on operational policy
- minimum payout threshold
- compliance hold checks
- dispute/refund hold checks

Bank verification:

- verified account required before first payout
- name/account mismatch creates hold
- failed verification requires seller/rider action

Retries:

- transient provider failure retries with same logical payout attempt
- permanent bank failure creates payout_failed state and ledger reversal
- repeated failures escalate to finance operations

Cash-flow management:

- payout batches must consider settled funds, gateway settlement delays, refund reserve, and operational risk reserve
- VENDORHUB must not pay out funds that are not economically or operationally eligible

---

## 6. Complete Refund and Dispute Architecture

Refunds reverse economic claims. Disputes suspend or reverse them under evidence.

### 6.1 Refund Flow

```txt
REFUND_REQUESTED
↓
VALIDATION
↓
APPROVAL
↓
PAYMENT_REVERSAL
↓
LEDGER_ADJUSTMENT
↓
RECONCILED
```

`REFUND_REQUESTED`

- Validation: order/payment exists, refundable amount remains, requester allowed.
- Ownership: buyer support, seller support, automated policy, or admin.
- Financial impact: no ledger movement yet unless reserve hold is required.
- Observability: request source, reason, amount, items.

`VALIDATION`

- Validation: captured amount, prior refunds, payout status, dispute status, policy window, fraud signals.
- Ownership: refund-service plus policy engine.
- Financial impact: may place hold on seller payable.
- Observability: validation result and rule version.

`APPROVAL`

- Validation: auto approval for clear policy cases; manual review for ambiguous/high-risk cases.
- Ownership: support/admin when manual.
- Financial impact: refund liability is authorized.
- Observability: approver, reason, evidence.

`PAYMENT_REVERSAL`

- Validation: provider supports refund amount, idempotency key exists.
- Ownership: payment/refund adapter.
- Financial impact: gateway refund object created.
- Observability: provider refund id, status, amount.

`LEDGER_ADJUSTMENT`

- Validation: gateway accepted or COD refund workflow approved.
- Ownership: ledger-service.
- Financial impact: seller payable, commission, tax, promotion, and cash accounts adjusted.
- Observability: adjustment journal id.

`RECONCILED`

- Validation: provider/bank/internal ledger agree.
- Ownership: reconciliation-service.
- Financial impact: refund is closed.
- Observability: reconciliation job id.

### 6.2 Refund Types

- full refund
- partial item refund
- delivery fee refund
- seller-funded refund
- platform-funded goodwill refund
- COD refund or wallet/credit replacement if supported by policy
- dispute-linked refund

### 6.3 Dispute System

Dispute types:

- payment dispute/chargeback
- buyer claim after delivery
- seller appeal against refund
- rider payout dispute
- COD variance dispute

Dispute workflow:

- open case
- freeze affected payable if required
- collect evidence
- classify financial exposure
- decide outcome
- post ledger adjustment
- reconcile external result

Evidence:

- payment confirmation
- order timeline
- delivery proof
- seller fulfillment evidence
- chat/support record
- refund history
- buyer/seller/rider risk profile

Financial fairness:

- do not punish seller or rider before evidence unless risk requires temporary hold
- holds must be visible with reason and expiry/review date
- every resolution posts explicit ledger entries

---

## 7. Complete Webhook Orchestration Architecture

Webhooks are asynchronous financial observations. They are never trusted blindly, never processed without deduplication, and never allowed to mutate money without idempotent state transition checks.

### 7.1 Webhook Flow

```txt
Provider Webhook
↓
Signature Verification
↓
Raw Event Storage
↓
Idempotency/Duplicate Check
↓
Canonical Event Mapping
↓
State Transition Validation
↓
Ledger/Workflow Dispatch
↓
Acknowledgement
↓
Replay/Dead-Letter if Needed
```

Signature verification:

- verify provider signature before processing
- store raw payload and headers
- reject invalid signatures with security event

Idempotency:

- provider event id unique constraint
- canonical event fingerprint
- processed-event table with status
- event handler idempotency per aggregate

Replay recovery:

- replay from raw webhook store
- replay by provider event id
- replay only through same canonical handlers
- replay must not create duplicate ledger entries

Retry orchestration:

- transient failures retry with exponential backoff
- permanent mapping failures go to dead letter
- finance operations receives queue health alerts

Dead-letter handling:

- include provider, event type, aggregate id, failure reason, retry count
- manual repair must create audit entry

### 7.2 Webhook Types

Payment webhooks:

- authorized
- captured/succeeded
- failed
- canceled/expired

Refund webhooks:

- refund created
- refund processed
- refund failed

Payout webhooks:

- payout initiated
- payout completed
- payout failed/reversed

Dispute webhooks:

- dispute opened
- evidence required
- dispute won/lost
- chargeback posted

### 7.3 Webhook Dashboards

- event volume by provider/type
- signature failure rate
- duplicate rate
- processing latency
- handler failure rate
- dead-letter count
- replay success rate
- state transition rejection count

---

## 8. Complete Idempotency and Consistency Architecture

Financial systems must be idempotent because clients retry, providers retry, networks timeout, workers crash, and humans click twice.

### 8.1 Idempotency Key Strategy

Payment:

```txt
payment:{order_id}:{checkout_version}:{attempt_number}
```

Capture:

```txt
capture:{payment_attempt_id}:{capture_version}
```

Refund:

```txt
refund:{order_id}:{refund_request_id}:{amount_minor}
```

Payout:

```txt
payout:{party_type}:{party_id}:{batch_id}
```

Webhook:

```txt
webhook:{provider}:{provider_event_id}
```

Ledger journal:

```txt
journal:{event_type}:{source_aggregate_id}:{source_version}
```

### 8.2 Consistency Rules

- unique constraints enforce one logical financial action
- state transitions are compare-and-set with expected prior state
- ledger posting occurs once per source event
- provider retries reuse idempotency key
- webhook handlers are safe to run repeatedly
- read models are rebuildable from ledger and events

### 8.3 Distributed Consistency Philosophy

VENDORHUB cannot rely on one global transaction across gateway, database, bank, and frontend. It must use durable state machines, outbox/inbox patterns, idempotency keys, reconciliation, and compensating entries.

---

## 9. Complete Financial Reconciliation Architecture

Reconciliation proves that money facts agree across systems.

### 9.1 Reconciliation Flow

```txt
Gateway Records
↓
Internal Ledger Comparison
↓
Mismatch Detection
↓
Escalation
↓
Correction Workflow
↓
Audit Finalization
```

Gateway Records:

- Observability: import job id, provider, report date, row counts, amount totals.
- Retry logic: retry failed imports; checksum successful imports.
- Ownership: reconciliation-service, finance ops for exceptions.

Internal Ledger Comparison:

- Observability: matched count, unmatched internal, unmatched external, amount variance.
- Retry logic: re-run after delayed webhooks/imports.
- Ownership: reconciliation-service.

Mismatch Detection:

- Observability: mismatch type, severity, party, age, amount.
- Retry logic: auto-resolve timing differences within defined window.
- Ownership: finance operations after SLA breach.

Escalation:

- Observability: case id, assigned owner, evidence packet.
- Retry logic: not applicable; human workflow.
- Ownership: finance ops/admin.

Correction Workflow:

- Observability: adjustment journal, approver, reason.
- Retry logic: idempotent adjustment creation.
- Ownership: finance ops plus ledger-service.

Audit Finalization:

- Observability: closed period, signed totals, export id.
- Retry logic: only regenerate export; do not mutate closed ledgers.
- Ownership: finance lead/admin.

### 9.2 Reconciliation Types

Gateway reconciliation:

- payments
- refunds
- gateway fees
- disputes

Ledger reconciliation:

- journal balance
- account balance
- party subledger balance
- order-level economic closure

Payout reconciliation:

- payout batch vs provider transfer
- provider transfer vs bank statement
- failed/reversed payout handling

Refund reconciliation:

- refund request vs provider refund
- provider refund vs ledger reversal
- refund vs buyer support state

---

## 10. Complete Financial Fraud Prevention Architecture

Financial trust requires risk controls before and after money movement.

### 10.1 Risk Areas

Payment fraud:

- stolen payment method
- suspicious velocity
- unusual address/device/account patterns
- repeated failed attempts

Refund abuse:

- repeated refund requests
- high refund ratio by buyer/seller/product
- policy exploitation
- refund after payout risk

Payout abuse:

- seller self-ordering
- fake fulfillment
- bank account takeover
- rider COD variance abuse

Chargeback risk:

- high-risk payment method
- mismatch between buyer behavior and order profile
- dispute history

### 10.2 Risk Scoring

Signals:

- payment velocity
- account age
- device fingerprint if available and compliant
- address distance anomalies
- refund history
- seller cancellation/refund rate
- rider COD variance
- basket value anomaly
- gateway risk signals

Actions:

- allow
- step-up verification
- manual review
- hold payout
- block refund automation
- block payment method

Governance:

- risk decisions must be explainable
- false positives must be reviewable
- holds must have owner and expiry/review path

---

## 11. Complete Realtime Transaction Synchronization

Realtime finance state reduces anxiety and operational ambiguity.

### 11.1 Transaction Event Propagation

```txt
Payment/Refund/Payout Event
↓
Canonical Finance Event
↓
Outbox
↓
Realtime Gateway
↓
Client/Admin Subscription
↓
State Reconciliation
```

Realtime surfaces:

- buyer checkout payment status
- order confirmation
- seller payout status
- rider payout status
- admin finance alerts
- reconciliation mismatch alerts

Stale-state recovery:

- client polls canonical backend when websocket reconnects
- backend verifies provider status for long-running pending payments
- stale frontend states expire with retry action

Replay synchronization:

- event log can replay to read models
- websocket missed events are recovered by version cursor
- admin dashboards show data freshness

---

## 12. Complete Financial Analytics Architecture

Finance analytics must distinguish activity from realized economics.

### 12.1 Analytics Domains

GMV analytics:

- gross order value
- captured GMV
- fulfilled GMV
- refunded GMV
- disputed GMV

Commission analytics:

- gross commission
- net commission after refunds
- commission by category/seller/region
- promotional commission impact

Payout analytics:

- eligible payouts
- pending payouts
- failed payouts
- payout aging
- payout reserve

Refund analytics:

- refund rate
- refund reason
- refund amount by seller/category
- automated vs manual refunds
- refund aging

Fraud analytics:

- chargeback rate
- risky transaction rate
- held payout amount
- abuse clusters

Dashboards:

- revenue dashboard
- settlement dashboard
- liquidity dashboard
- refund dashboard
- payout dashboard
- anomaly heatmap

---

## 13. Complete Tax and Compliance Architecture

Compliance must be designed into the ledger and invoice lifecycle.

### 13.1 GST and Tax Calculations

Tax calculations require:

- taxable supply classification
- seller tax profile
- buyer location where required
- product category tax rules
- platform fee tax treatment
- delivery fee tax treatment
- discount tax treatment

Rules:

- tax rule version is stored with transaction
- invoice totals must tie to ledger entries
- tax corrections require credit/debit note or adjustment record
- closed tax periods are never mutated

### 13.2 Invoice Lifecycle

```txt
Invoice Draft
↓
Order Financial Validation
↓
Invoice Issued
↓
Refund/Credit Note if Needed
↓
Tax Export
↓
Audit Archive
```

Invoice types:

- buyer invoice/receipt
- seller settlement statement
- platform commission invoice
- rider payout statement
- refund credit note

Compliance exports:

- GST summary exports
- invoice register
- payout tax deduction report
- commission revenue report
- refund adjustment report

---

## 14. Complete Failure and Recovery Architecture

Financial failure must degrade into controlled uncertainty, not silent inconsistency.

Failure modes:

- payment authorization failure
- capture timeout
- duplicate payment attempt
- refund provider failure
- payout provider failure
- webhook outage
- gateway outage
- reconciliation mismatch
- ledger posting failure

Recovery workflows:

- retry transient calls with idempotency key
- poll provider for uncertain payment state
- hold order while payment is unknown
- expire pending attempts after policy window
- route to alternate payment method only with new attempt
- queue ledger posting through durable outbox
- pause payout batch on serious mismatch
- escalate unreconciled high-value items

Fallback payment modes:

- alternate online provider before authorization
- COD where operationally allowed
- saved payment method retry where supported
- manual finance review for edge cases

Trust preservation:

- show honest pending state
- avoid duplicate charge risk
- never tell buyer an order is paid until canonical state confirms it
- never release payout for disputed/uncertain funds

---

## 15. Complete Database and Storage Architecture

Financial storage must optimize for immutability, uniqueness, traceability, and reconciliation.

### 15.1 `transactions`

Columns:

- `id`
- `order_id`
- `buyer_id`
- `currency`
- `amount_minor`
- `canonical_state`
- `payment_rail`
- `provider`
- `active_payment_attempt_id`
- `captured_at`
- `settled_at`
- `reconciled_at`
- `created_at`
- `updated_at`

Constraints:

- one active transaction per order
- amount must be non-negative
- valid canonical state enum

Indexes:

- `(order_id)`
- `(buyer_id, created_at)`
- `(canonical_state, updated_at)`
- `(provider, created_at)`

Relationships:

- has many payment attempts, refunds, ledger entries

Retention:

- retain permanently or according to statutory financial record policy

### 15.2 `ledger_entries`

Columns:

- `id`
- `journal_id`
- `source_type`
- `source_id`
- `account_code`
- `party_type`
- `party_id`
- `currency`
- `debit_minor`
- `credit_minor`
- `description`
- `created_at`
- `posted_at`
- `reversal_of_entry_id`

Constraints:

- debit or credit, not both
- journal must balance
- entries append-only

Indexes:

- `(journal_id)`
- `(source_type, source_id)`
- `(party_type, party_id, posted_at)`
- `(account_code, posted_at)`

Relationships:

- belongs to journal/source aggregate

Retention:

- permanent financial record

### 15.3 `refunds`

Columns:

- `id`
- `transaction_id`
- `order_id`
- `refund_request_id`
- `provider_refund_id`
- `amount_minor`
- `currency`
- `state`
- `reason_code`
- `approval_type`
- `approved_by`
- `idempotency_key`
- `requested_at`
- `processed_at`
- `reconciled_at`

Constraints:

- unique idempotency key
- refund amount cannot exceed remaining refundable amount

Indexes:

- `(transaction_id)`
- `(state, requested_at)`
- `(provider_refund_id)`

Retention:

- permanent/audit retention

### 15.4 `payouts`

Columns:

- `id`
- `party_type`
- `party_id`
- `batch_id`
- `amount_minor`
- `currency`
- `state`
- `provider_payout_id`
- `bank_reference`
- `idempotency_key`
- `initiated_at`
- `completed_at`
- `reconciled_at`
- `failure_code`

Constraints:

- unique idempotency key
- payout amount positive

Indexes:

- `(party_type, party_id, created_at)`
- `(batch_id)`
- `(state, updated_at)`
- `(provider_payout_id)`

Retention:

- permanent/audit retention

### 15.5 `commissions`

Columns:

- `id`
- `order_id`
- `seller_id`
- `commission_rule_id`
- `basis_amount_minor`
- `commission_amount_minor`
- `tax_amount_minor`
- `currency`
- `state`
- `created_at`

Constraints:

- rule id required
- amounts non-negative

Indexes:

- `(order_id)`
- `(seller_id, created_at)`
- `(commission_rule_id)`

Retention:

- financial statutory retention

### 15.6 `payment_attempts`

Columns:

- `id`
- `transaction_id`
- `provider`
- `payment_rail`
- `provider_payment_id`
- `provider_order_id`
- `state`
- `amount_minor`
- `currency`
- `idempotency_key`
- `attempt_number`
- `failure_code`
- `created_at`
- `updated_at`

Constraints:

- unique idempotency key
- unique provider payment id where present
- one active attempt per transaction unless prior attempt terminal

Indexes:

- `(transaction_id, attempt_number)`
- `(provider, provider_payment_id)`
- `(state, updated_at)`

Retention:

- permanent/audit retention

### 15.7 `webhook_events`

Columns:

- `id`
- `provider`
- `provider_event_id`
- `event_type`
- `signature_valid`
- `raw_payload`
- `headers`
- `canonical_event_type`
- `aggregate_type`
- `aggregate_id`
- `processing_state`
- `retry_count`
- `error_message`
- `received_at`
- `processed_at`

Constraints:

- unique `(provider, provider_event_id)`
- raw payload immutable

Indexes:

- `(provider, event_type, received_at)`
- `(processing_state, received_at)`
- `(aggregate_type, aggregate_id)`

Retention:

- long-term audit retention; raw payload retention follows security/compliance policy

### 15.8 `reconciliation_jobs`

Columns:

- `id`
- `job_type`
- `provider`
- `period_start`
- `period_end`
- `state`
- `imported_count`
- `matched_count`
- `mismatch_count`
- `amount_variance_minor`
- `started_at`
- `completed_at`
- `created_by`

Constraints:

- one completed job per provider/type/period unless superseded

Indexes:

- `(job_type, provider, period_start)`
- `(state, started_at)`

Retention:

- permanent summary; source imports per compliance policy

### 15.9 `invoices`

Columns:

- `id`
- `invoice_number`
- `invoice_type`
- `order_id`
- `party_type`
- `party_id`
- `currency`
- `subtotal_minor`
- `tax_minor`
- `total_minor`
- `state`
- `issued_at`
- `voided_at`
- `created_at`

Constraints:

- unique invoice number
- issued invoices immutable except void/credit workflow

Indexes:

- `(invoice_number)`
- `(party_type, party_id, issued_at)`
- `(order_id)`

Retention:

- statutory tax retention

### 15.10 `tax_records`

Columns:

- `id`
- `source_type`
- `source_id`
- `tax_rule_id`
- `tax_type`
- `taxable_amount_minor`
- `tax_amount_minor`
- `currency`
- `jurisdiction`
- `created_at`

Constraints:

- source required
- tax rule required

Indexes:

- `(source_type, source_id)`
- `(tax_type, jurisdiction, created_at)`

Retention:

- statutory tax retention

### 15.11 `financial_audits`

Columns:

- `id`
- `audit_type`
- `source_type`
- `source_id`
- `actor_type`
- `actor_id`
- `action`
- `before_hash`
- `after_hash`
- `reason`
- `created_at`

Constraints:

- append-only
- source required

Indexes:

- `(source_type, source_id, created_at)`
- `(actor_type, actor_id, created_at)`
- `(audit_type, created_at)`

Retention:

- permanent or statutory audit retention

---

## 16. Complete Observability and Auditability Architecture

Financial observability must trace every rupee across gateway, ledger, order, refund, payout, and reconciliation.

Tracing:

- transaction trace id
- payment attempt trace id
- webhook trace id
- journal id
- payout batch id
- reconciliation job id

Dashboards:

- payment success/failure rate
- pending payment aging
- duplicate prevention count
- ledger imbalance alerts
- payout aging
- refund aging
- webhook dead letters
- reconciliation variance
- COD variance

Alerts:

- ledger journal imbalance
- capture without ledger posting
- ledger posting without provider confirmation
- payout batch mismatch
- refund amount exceeds policy
- webhook processing backlog
- unreconciled high-value transaction

Audit replay:

- replay transaction lifecycle
- replay webhook events
- replay ledger journal sequence
- rebuild party balance
- compare current read model to ledger-derived truth

---

## 17. Complete Frontend Financial UX

Financial UX must reduce anxiety and prevent dangerous user actions.

Buyer UX:

- clear payment processing state
- no false success before backend confirmation
- retry only when safe
- show refund request state and expected timeline
- show payment failure reason in useful language

Seller UX:

- order earning breakdown
- commission and tax visibility
- pending/eligible/processing/paid payout status
- refund and dispute impact
- settlement statement downloads

Rider UX:

- delivery earning
- incentive
- COD collection responsibility
- payout status
- failed payout action prompts

Admin UX:

- transaction timeline
- provider ids
- ledger entries
- webhook events
- refund approval
- dispute evidence
- reconciliation mismatch workflow

Loading/retry states:

- payment pending
- confirming with bank/provider
- safe retry available
- do not retry; support needed
- refund processing
- payout processing

Reconciliation visibility:

- buyer does not need reconciliation details
- seller/rider can see finalized payout lines
- admin can see reconciliation state and exceptions

---

## 18. Complete Engineering Governance

Finance engineering must be stricter than ordinary product engineering.

Ledger conventions:

- append-only entries
- balanced journals
- no direct balance mutation
- corrections through reversal/adjustment
- source event id required

Webhook conventions:

- verify signature first
- store raw event before processing
- deduplicate by provider event id
- process through canonical mapper
- handlers idempotent

Reconciliation conventions:

- every import has checksum/count/total
- mismatches become cases
- adjustments require reason and approver
- closed periods are immutable

Payout conventions:

- payout only from ledger eligibility
- batch locking is explicit
- provider references are stored
- failures reverse or requeue with audit trace

Financial state-machine rules:

- transitions are explicit
- terminal states are protected
- illegal transitions are rejected and logged
- state is not inferred from frontend

Transaction-safety rules:

- never create financial side effects in GET/read paths
- never call gateway without idempotency key
- never post ledger without source event
- never delete financial records
- never hide reconciliation mismatch

---

## 19. Complete Testing Strategy

Financial testing must prove consistency under retries, partial failures, delayed events, and provider disagreement.

Duplicate-payment tests:

- double-click checkout
- client retry after timeout
- provider API timeout but payment succeeds
- two active attempts blocked

Webhook replay tests:

- duplicate provider event
- out-of-order events
- delayed success after frontend failure
- invalid signature
- dead-letter replay

Payout consistency tests:

- batch creation from eligible ledger entries
- payout provider timeout
- payout failure reversal
- bank return after completed provider state

Reconciliation simulations:

- missing provider payment
- missing internal ledger entry
- amount mismatch
- delayed refund settlement
- gateway fee variance

Refund chaos testing:

- refund retry
- partial refund after payout
- refund during dispute
- provider refund success but webhook delayed

Ledger integrity tests:

- every journal balances
- party balances rebuild from entries
- reversal entries preserve audit
- closed-period mutation blocked

Gateway outage drills:

- payment provider unavailable
- webhook endpoint unavailable
- settlement report import failure
- provider API status polling degraded

Operational trust validation:

- user-facing state remains truthful
- admin can recover every uncertain transaction
- no duplicate charge/refund/payout occurs

---

## 20. Complete AI-Assisted Financial Engineering Workflow

VENDORHUB uses Claude, Codex, and AI-assisted engineering. Finance work must treat AI output as draft logic until consistency, idempotency, and auditability are proven.

Payment prompt:

```txt
Implement this payment flow using VENDORHUB canonical payment states, provider adapters, idempotency keys, webhook confirmation, durable outbox events, and ledger posting. Do not rely on frontend redirect state as financial truth.
```

Ledger prompt:

```txt
Implement this financial event as balanced immutable double-entry ledger journals. Include source ids, reversal behavior, party subledger impact, and tests that rebuild balances from entries.
```

Payout prompt:

```txt
Implement payout logic only from ledger-derived eligible payables. Include batch locking, idempotency, provider references, retry behavior, failure reversal, reconciliation, and audit logs.
```

Reconciliation prompt:

```txt
Implement reconciliation between provider records and internal ledger with import checksums, mismatch classification, timing-difference handling, escalation cases, correction journals, and audit finalization.
```

Webhook prompt:

```txt
Implement webhook handling with signature verification, raw event storage, provider event deduplication, canonical mapping, state transition validation, idempotent handlers, retry, dead-letter, and replay support.
```

Consistency review prompt:

```txt
Review this finance change for duplicate side effects, illegal state transitions, missing idempotency, ledger imbalance, provider/internal mismatch, retry safety, audit gaps, and reconciliation impact.
```

Financial audit prompt:

```txt
Trace this transaction from checkout through provider events, ledger entries, split allocation, refunds/disputes, payout, reconciliation, and audit records. Identify any unverifiable financial movement.
```

AI governance:

- AI may draft finance code but must not invent accounting rules.
- AI-generated finance changes require explicit tests for retries and duplicate events.
- Any shortcut that mutates balances directly is rejected.
- Any missing idempotency key is a release blocker.

---

## 21. Complete Implementation Sequencing

### 21.1 Dependency Graph

```txt
Financial Domain Model
↓
Immutable Ledger
↓
Idempotency Framework
↓
Payment Attempts
↓
Provider Adapters
↓
Webhook Orchestration
↓
Split Allocation
↓
Refunds
↓
Payouts
↓
Reconciliation
↓
Observability
↓
Frontend Financial UX
↓
Finance Admin
```

### 21.2 Exact Implementation Order

1. Define canonical financial states, enums, event contracts, and audit requirements.
2. Implement immutable double-entry ledger tables, journal balancing, and ledger-derived balance read models.
3. Implement idempotency key storage and transaction-safe state transition helpers.
4. Implement `transactions` and `payment_attempts` with provider-neutral payment orchestration.
5. Implement Stripe, Razorpay, and COD adapters behind capability-aware interfaces.
6. Implement webhook ingestion: signature verification, raw storage, deduplication, canonical mapping, retry, dead letter, and replay.
7. Implement payment capture confirmation and ledger posting.
8. Implement split allocation: commission, seller payable, rider payable, tax, promotions.
9. Implement refund requests, validation, approvals, provider reversal, ledger adjustment, and reconciliation.
10. Implement payout eligibility, batching, initiation, failure recovery, and payout ledger posting.
11. Implement dispute holds, evidence workflow, and dispute financial resolution.
12. Implement gateway, ledger, refund, payout, and bank reconciliation jobs.
13. Implement financial observability dashboards, alerts, and audit replay.
14. Implement buyer, seller, rider, and admin financial UX.
15. Implement tax invoice lifecycle, compliance exports, and settlement statements.
16. Run duplicate payment, webhook replay, payout failure, refund chaos, and reconciliation simulations.
17. Launch in sandbox/test mode with provider test credentials and synthetic reconciliation.
18. Launch limited live region with payout holds and finance operations review.
19. Enable automated payouts only after reconciliation and audit gates are stable.

### 21.3 Activation Gates

Before live financial orchestration is enabled, VENDORHUB must have:

- immutable balanced ledger
- idempotent payment/refund/payout/webhook handling
- provider webhook verification
- payment uncertainty recovery
- split allocation correctness
- refund reversal correctness
- payout eligibility from ledger only
- reconciliation jobs and dashboards
- audit replay
- finance admin exception workflow
- rollback/degraded-mode playbooks

Live payments without these gates would create unbounded trust risk. VENDORHUB finance must move fast enough for commerce and carefully enough for money.

---

## Provider Reference Notes

This constitution uses provider concepts verified against official documentation at architecture level only:

- Stripe PaymentIntents lifecycle, webhook monitoring, and idempotency guidance: https://docs.stripe.com/payments/payment-intents
- Razorpay Payments API capture behavior: https://razorpay.com/docs/api/payments/
- Razorpay Refunds API and idempotent refund request support: https://razorpay.com/docs/api/refunds/
- Razorpay webhook event coverage for payment flow, settlements, and disputes: https://razorpay.com/docs/webhooks/?preferred-country=IN

Provider APIs must still be reviewed against the current official docs at implementation time.

---

## Final Phase 11 Lock

Phase 11 establishes VENDORHUB as a financially trustworthy realtime marketplace. Payments, ledger, split settlement, commissions, refunds, disputes, payouts, reconciliation, fraud controls, tax, observability, and frontend financial reassurance are one operating layer.

The system is successful when every charge is intentional, every refund is traceable, every payout is eligible, every commission is explainable, every mismatch becomes visible work, and every rupee can be replayed from immutable records.
