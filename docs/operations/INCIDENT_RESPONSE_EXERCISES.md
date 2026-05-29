# KARTEX — Incident Response Exercises (Game Days)

Phase D operational simulations. Each exercise has an injection method, expected
**controlled** behavior, detection signal, and time targets (MTTD/MTTA/MTTR/MTTC).
Run in **staging** unless marked tabletop. Application-level faults use the Phase D
fault injector (`CHAOS_*` env / `faultInjector.configure`); infra faults use the
runtime compose (`docker compose ... stop <svc>`).

> Time targets (initial): **MTTD** ≤ 5m · **MTTA** ≤ 10m · **MTTR** ≤ 30m (P1 critical-path) · **MTTC** (comms) ≤ 15m. Record actuals each drill.

| # | Scenario | Injection | Expected controlled behavior | Primary signal | Runbook |
|---|---|---|---|---|---|
| 1 | <a id="payment-provider-outage"></a>Payment provider outage | `CHAOS_TARGETS=razorpay CHAOS_MODE=error` or block Razorpay egress | Circuit breaker opens → fast-fail checkout with retry-later UX; no orphan orders; webhook reconciliation drains backlog on recovery | `PaymentsSLOFastBurn`, `kartex_payments_failed_total` | PHASE_30 runbook#payments |
| 2 | Database failure | Stop/again Supabase (staging) or revoke connection | Readiness fails → traffic shed; no partial writes (atomic checkout); restore-drill path if data loss | `/api/readiness` down, `kartex_dependency_errors_total{dependency="supabase"}` | DISASTER_RECOVERY_PLAYBOOK |
| 3 | Kafka failure | `docker compose stop kafka` | Producers degrade to Postgres durable events (Phase B fallback); consumers resume + replay on recovery; no lost commerce events | `kartex_runtime_up{runtime="kafka"}==0`, lag | runbook#kafka |
| 4 | Redis failure | `docker compose stop redis` | Rate limiter + cache fall back to in-memory/source; latency rises but service continues | `kartex_runtime_up{runtime="redis"}==0` | runbook#runtime |
| 5 | Mass order spike | `reliability-load.mjs` at 5–10x + `CHAOS_MODE=latency` | Backpressure + queue throttling; p95 degrades within SLO budget; no collapse; workers drain | `kartex_queue_depth`, `MarketplaceLatencySLOBreach` | runbook#load |
| 6 | Security incident (token/secret leak) | tabletop + rotate secrets | Kill switch + secret rotation; sessions invalidated; audit trail intact | auth anomaly alert | DISASTER_RECOVERY_PLAYBOOK#security |
| 7 | Data corruption | inject bad rows (staging) | `ops:consistency-check --enforce` detects breach; freeze writes; compensating migration | consistency breach count | rollback-plan#database |
| 8 | Infrastructure / region failure | `simulateGlobalFailure` + stop a runtime | `planRegionalFailover` reroutes; critical writes freeze→reconcile; failback gated on stability | regional outage alert | DISASTER_RECOVERY_PLAYBOOK |
| 9 | Webhook storm | `CHAOS_TARGETS=razorpay CHAOS_MODE=latency` + replay flood | Idempotent ingestion (`webhook_ingestions`) dedupes; DLQ captures poison; no double-capture | webhook retry/DLQ alerts | runbook#payments |
| 10 | Worker scheduler outage (current gap) | disable scheduler | **D-C1 gap**: backlog grows silently until `CronFreshnessSLOBreach` heartbeat fires | `kartex_queue_depth`, cron freshness | runbook#async |

## Exercise procedure
1. Announce window + hypothesis ("system degrades gracefully, recovers within RTO").
2. Inject fault; start clock.
3. Record MTTD (alert fired), MTTA (ack), MTTR (recovered + verified), MTTC (status comms).
4. Verify **no data loss** (`ops:consistency-check`), **no orphan/duplicate** records, audit completeness.
5. Stop injection; confirm auto-recovery (breaker closes, lag drains, queues empty).
6. Write up: what was detected/contained/explained/recovered/verified; file remediation for any blind spot.

## Pass criteria
A scenario PASSES when the failure became an **operational event** (detected, contained, explained, recovered, audited, verified) within time targets — not a business catastrophe.
