import { describe, expect, it } from "vitest";
import { simulatePhase34Failure, simulatePhase34FinanceLoad } from "@/features/commerce-finance/financial-recovery";
import { buildPaymentCaptureJournal, buildPayoutReleaseJournal, evaluateLedgerConsistency } from "@/features/commerce-finance/ledger-operating-system";
import { evaluateFinanceTelemetry } from "@/features/commerce-finance/observability";
import { buildPayoutOrchestrationPlan } from "@/features/commerce-finance/payout-orchestration";
import { calculateRefundAccounting } from "@/features/commerce-finance/refund-accounting";
import { diagnoseReconciliation, summarizeReconciliationHealth } from "@/features/commerce-finance/reconciliation-intelligence";
import { evaluateSettlementSignal } from "@/features/commerce-finance/settlement-intelligence";

describe("Phase 34 finance operating system", () => {
  it("keeps payment capture journals balanced and replay-identifiable", () => {
    const journal = buildPaymentCaptureJournal({
      orderId: "order-1",
      transactionId: "txn-1",
      paymentAttemptId: "attempt-1",
      vendorId: "vendor-1",
      providerEventId: "evt-1",
      grossAmount: 1000,
      commissionAmount: 80,
    });
    const report = evaluateLedgerConsistency(journal);

    expect(report.state).toBe("BALANCED");
    expect(report.totalDebit).toBe(2000);
    expect(report.totalCredit).toBe(2000);
    expect(report.replayKey).toHaveLength(64);
  });

  it("blocks imbalanced ledger journals before posting", () => {
    const journal = buildPayoutReleaseJournal({ payoutBatchId: "batch-1", vendorId: "vendor-1", amount: 500 });
    journal.entries[1].amount = 499;

    const report = evaluateLedgerConsistency(journal);

    expect(report.state).toBe("IMBALANCED");
    expect(report.repairActions).toContain("open ledger imbalance case");
  });

  it("makes trust-aware payout release, delay, retry, hold, and block decisions", () => {
    const release = buildPayoutOrchestrationPlan({
      vendorId: "vendor-good",
      availableAmount: 2500,
      settlementAgeHours: 48,
      trustScore: 92,
      openDisputes: 0,
      refundRate: 0.02,
      failedPayoutAttempts: 0,
      payoutMethodReady: true,
      reconciliationOpenCases: 0,
    });
    const blocked = buildPayoutOrchestrationPlan({
      vendorId: "vendor-risk",
      availableAmount: 2500,
      settlementAgeHours: 48,
      trustScore: 35,
      openDisputes: 4,
      refundRate: 0.35,
      failedPayoutAttempts: 4,
      payoutMethodReady: false,
      reconciliationOpenCases: 2,
    });

    expect(release.decision).toBe("release");
    expect(blocked.decision).toBe("block");
    expect(blocked.maxBatchAmount).toBe(0);
  });

  it("diagnoses reconciliation drift and replay anomalies", () => {
    const diagnosis = diagnoseReconciliation({
      domain: "payout",
      expectedAmount: 1000,
      observedAmount: 900,
      ageHours: 30,
      replayCount: 3,
      backlogCount: 25,
    });
    const summary = summarizeReconciliationHealth([
      { domain: "payment", expectedAmount: 500, observedAmount: 500, ageHours: 1, replayCount: 0, backlogCount: 1 },
      { domain: "refund", expectedAmount: 300, observedAmount: 260, ageHours: 8, replayCount: 1, backlogCount: 70 },
    ]);

    expect(diagnosis.severity).toBe("critical");
    expect(diagnosis.replayAnomaly).toBe(true);
    expect(summary.warningCount + summary.criticalCount).toBeGreaterThan(0);
  });

  it("keeps refund accounting balanced for partial multi-item dispute refunds", () => {
    const accounting = calculateRefundAccounting({
      refundRequestId: "refund-1",
      orderId: "order-1",
      transactionId: "txn-1",
      paymentAttemptId: "attempt-1",
      vendorId: "vendor-1",
      providerRefundId: "rfnd-1",
      orderGrossAmount: 1000,
      settlementCommissionAmount: 80,
      requestedRefundAmount: 400,
      deliveryAdjustmentAmount: 20,
      itemRefundAmounts: [150, 230],
      disputeLinked: true,
    });

    expect(accounting.partialRefund).toBe(true);
    expect(accounting.multiItemRefund).toBe(true);
    expect(accounting.commissionReversal).toBe(32);
    expect(accounting.consistency.state).toBe("BALANCED");
  });

  it("detects settlement delay and amount mismatches before payout release", () => {
    const result = evaluateSettlementSignal({
      settlementId: "set-1",
      expectedAmount: 1000,
      providerAmount: 980,
      ledgerAmount: 1000,
      expectedPayoutAt: "2026-05-25T00:00:00.000Z",
      now: "2026-05-27T12:00:00.000Z",
      lifecycleState: "PAYOUT_PENDING",
      openReconciliationCases: 0,
      providerSettlementId: "rzp-set-1",
    });

    expect(result.risk).toBe("mismatch");
    expect(result.recoveryActions).toContain("block payout release");
  });

  it("alerts and recovers under finance load and failure simulations", () => {
    const load = simulatePhase34FinanceLoad({
      payoutFlood: 1200,
      settlementReplays: 600,
      refundSpike: 180,
      reconciliationBacklog: 300,
      ledgerReplayFlood: 1600,
      webhookStorm: 4500,
      payoutRetryStorm: 260,
    });

    expect(load.alerts.some((alert) => alert.id === "ledger-corruption-risk")).toBe(true);
    expect(evaluateFinanceTelemetry(load.telemetry).length).toBeGreaterThan(0);
    expect(simulatePhase34Failure("payout_duplication_attempt").financialTruthProtected).toBe(true);
  });
});
