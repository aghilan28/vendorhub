import { PaymentStatus } from "@/types";
import type { PaymentRecoveryState } from "./types";

export function getPaymentRecoveryState(status: PaymentStatus, method: string): PaymentRecoveryState {
  if (status === PaymentStatus.Processing || status === PaymentStatus.Pending) {
    return {
      title: "Payment confirmation is taking a moment",
      message: method === "upi" ? "Your UPI app may still send confirmation. We will keep checking before asking you to pay again." : "The gateway has not sent final confirmation yet.",
      action: "Check status or retry after a minute",
    };
  }

  if (status === PaymentStatus.Failed) {
    return {
      title: method === "upi" ? "UPI payment was interrupted" : "Payment was not completed",
      message: "No successful capture is recorded for this order. Your cart and order context are still safe.",
      action: "Retry payment or switch mode",
    };
  }

  if (status === PaymentStatus.CodPending) {
    return {
      title: "COD order is awaiting confirmation",
      message: "The seller can process this order after COD operational checks are complete.",
      action: "Track COD confirmation",
    };
  }

  if (status === PaymentStatus.RefundPending) {
    return {
      title: "Refund review is active",
      message: "The marketplace team has the refund request and will update reversal status after review.",
      action: "View refund timeline",
    };
  }

  return {
    title: "Transaction verified",
    message: "Payment, invoice, and settlement references are available for this order.",
    action: "View invoice",
  };
}
