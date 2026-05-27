import { describe, expect, it } from "vitest";
import {
  assertBalancedJournal,
  buildSettlementLedgerEntries,
  calculateCommission,
  calculateRefundAdjustment,
  canTransitionSettlement,
  nextPayoutRetryState,
} from "@/features/commerce-finance/marketplace-economics";

describe("marketplace financial engine", () => {
  it("selects the most specific explainable commission rule", () => {
    const result = calculateCommission({
      orderId: "order-1",
      vendorId: "seller-pro",
      categoryId: "cat-grocery",
      grossAmount: 1000,
      rules: [
        { id: "default", scope: "DEFAULT", rateBps: 800, explanation: "Default platform commission." },
        { id: "category", scope: "CATEGORY", categoryId: "cat-grocery", rateBps: 600, explanation: "Grocery category commission." },
        { id: "seller", scope: "SELLER_OVERRIDE", vendorId: "seller-pro", rateBps: 500, explanation: "Seller tier override." },
      ],
    });

    expect(result).toMatchObject({
      ruleId: "seller",
      commissionAmount: 50,
      sellerNetAmount: 950,
      explanation: "Seller tier override.",
    });
  });

  it("posts balanced settlement ledger entries for seller payable and platform revenue", () => {
    const entries = buildSettlementLedgerEntries({ grossAmount: 750, commissionAmount: 60, vendorId: "seller-1" });

    expect(assertBalancedJournal(entries)).toBe(true);
    expect(entries.find((entry) => entry.accountCode === "seller_payable")).toMatchObject({ direction: "CREDIT", amount: 690 });
    expect(entries.find((entry) => entry.accountCode === "platform_commission_revenue")).toMatchObject({ direction: "CREDIT", amount: 60 });
  });

  it("keeps partial refund accounting balanced and proportional", () => {
    const adjustment = calculateRefundAdjustment({ refundAmount: 250, settlementGross: 1000, settlementCommission: 80 });

    expect(adjustment).toMatchObject({
      sellerReversal: 230,
      commissionReversal: 20,
      entriesBalance: true,
    });
  });

  it("rejects invalid settlement jumps while allowing recovery paths", () => {
    expect(canTransitionSettlement("PENDING_SETTLEMENT", "PAYOUT_COMPLETED")).toBe(false);
    expect(canTransitionSettlement("PAYOUT_FAILED", "PAYOUT_PROCESSING")).toBe(true);
    expect(canTransitionSettlement("PAYOUT_COMPLETED", "REFUND_ADJUSTED")).toBe(true);
  });

  it("limits payout retry state transitions after repeated failures", () => {
    expect(nextPayoutRetryState("FAILED", 0)).toBe("RETRYING");
    expect(nextPayoutRetryState("FAILED", 3)).toBe("FAILED");
    expect(nextPayoutRetryState("COMPLETED", 0)).toBe("COMPLETED");
  });
});
