import { PaymentStatus } from "@/types";
import type { MoneyBreakdown, PaymentTransaction } from "@/types";

export function createRazorpaySandboxIntent(pricing: MoneyBreakdown, orderCode: string, method: PaymentTransaction["method"]): PaymentTransaction {
  const numericCode = orderCode.replace(/\D/g, "");
  const now = new Date().toISOString();

  return {
    intentId: `intent_kx_${numericCode}`,
    razorpayOrderId: `order_KX${numericCode}SANDBOX`,
    reference: `KXRP${numericCode}${pricing.total}`,
    method,
    status: PaymentStatus.IntentCreated,
    amount: pricing.total,
    currency: pricing.currency,
    createdAt: now,
    updatedAt: now,
  };
}

export async function processRazorpaySandboxPayment(transaction: PaymentTransaction, mode: "success" | "failure" | "pending" = "success") {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const now = new Date().toISOString();

  if (mode === "failure") {
    return {
      ...transaction,
      status: PaymentStatus.Failed,
      updatedAt: now,
      failureReason: "Sandbox gateway declined this attempt. No money was captured.",
    };
  }

  if (mode === "pending") {
    return {
      ...transaction,
      status: PaymentStatus.Pending,
      updatedAt: now,
    };
  }

  return {
    ...transaction,
    status: PaymentStatus.Succeeded,
    razorpayPaymentId: transaction.razorpayPaymentId ?? transaction.razorpayOrderId.replace("order_", "pay_"),
    updatedAt: now,
  };
}
