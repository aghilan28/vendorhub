import { PaymentStatus } from "@/types";
import { scoreCodRisk } from "@/lib/india/cod-risk";
import type { CodEligibilityResult, CodRuleInput } from "./types";

const COD_MAX_AMOUNT = 4999;
const COD_BLOCKED_PIN_PREFIXES = ["5601", "999"];

export function checkCodEligibility(input: CodRuleInput & { codHistory?: Parameters<typeof scoreCodRisk>[0] }): CodEligibilityResult {
  const { items, total, pincode, codHistory } = input;
  const hasSellerCodBlock = items.some((item) => item.product.tags?.includes("no-cod"));
  const blockedArea = COD_BLOCKED_PIN_PREFIXES.some((prefix) => pincode.startsWith(prefix));
  const codRisk = codHistory ? scoreCodRisk(codHistory) : null;

  if (!items.length) {
    return { eligible: false, maxAmount: COD_MAX_AMOUNT, reason: "Add products before checking COD.", verificationState: "blocked" };
  }

  if (total > COD_MAX_AMOUNT) {
    return {
      eligible: false,
      maxAmount: COD_MAX_AMOUNT,
      reason: `COD is available up to Rs ${COD_MAX_AMOUNT.toLocaleString("en-IN")} for this delivery zone.`,
      verificationState: "blocked",
    };
  }

  if (blockedArea) {
    return {
      eligible: false,
      maxAmount: COD_MAX_AMOUNT,
      reason: "COD is temporarily restricted for this pincode while local collection reliability is monitored.",
      verificationState: "blocked",
    };
  }

  if (hasSellerCodBlock) {
    return {
      eligible: false,
      maxAmount: COD_MAX_AMOUNT,
      reason: "One seller in this cart has disabled COD for the selected item.",
      verificationState: "blocked",
    };
  }

  if (codRisk && !codRisk.eligible) {
    return {
      eligible: false,
      maxAmount: COD_MAX_AMOUNT,
      reason: codRisk.reason,
      verificationState: "blocked",
    };
  }

  return {
    eligible: true,
    maxAmount: COD_MAX_AMOUNT,
    verificationState: total >= 1999 || codRisk?.verificationRequired ? "otp_placeholder" : "not_required",
  };
}

export function getCodPaymentStatus(eligible: boolean): PaymentStatus.CodPending | PaymentStatus.Failed {
  return eligible ? PaymentStatus.CodPending : PaymentStatus.Failed;
}

export function codTrustMessage(result: CodEligibilityResult) {
  if (!result.eligible) return result.reason ?? "COD is not available for this order.";
  if (result.verificationState === "otp_placeholder") return "COD available. Delivery partner may verify this order before dispatch.";
  return "COD available for this address. Keep exact change or pay the partner by UPI at delivery.";
}
