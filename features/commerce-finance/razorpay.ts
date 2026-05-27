import crypto from "crypto";
import Razorpay from "razorpay";
import { PaymentStatus } from "@/types";
import type { MoneyBreakdown, PaymentTransaction } from "@/types";
import { env } from "@/lib/env";
import type { RazorpayCreateOrderInput, RazorpayVerificationInput, RazorpayWebhookResult } from "./types";
import { buildUpiDeepLink } from "./upi";

let razorpayClient: Razorpay | undefined;

export function getRazorpayClient() {
  if (!env.futureIntegrations.razorpayKeyId || !env.futureIntegrations.razorpaySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for live payment orchestration.");
  }

  razorpayClient ??= new Razorpay({
    key_id: env.futureIntegrations.razorpayKeyId,
    key_secret: env.futureIntegrations.razorpaySecret,
  });

  return razorpayClient;
}

export function createRazorpayOrderPayload(input: RazorpayCreateOrderInput) {
  return {
    amount: Math.round(input.amount * 100),
    currency: input.currency,
    receipt: input.receipt,
    payment_capture: 1,
    notes: input.notes ?? {},
  };
}

export function createRazorpayCommerceIntent(pricing: MoneyBreakdown, orderCode: string, method: PaymentTransaction["method"], upiApp?: PaymentTransaction["upiApp"]): PaymentTransaction {
  const numericCode = orderCode.replace(/\D/g, "");
  const now = new Date().toISOString();
  const isCod = method === "cod";
  const referencePrefix = isCod ? "VHCOD" : method === "upi" ? "VHUPI" : "VHRP";

  return {
    intentId: `intent_vh_${numericCode}`,
    razorpayOrderId: isCod ? `cod_${numericCode}` : `order_VH${numericCode}`,
    reference: `${referencePrefix}${numericCode}${pricing.total}`,
    method,
    status: isCod ? PaymentStatus.CodPending : PaymentStatus.IntentCreated,
    amount: pricing.total,
    currency: "INR",
    upiApp,
    upiDeepLink: method === "upi" ? buildUpiDeepLink({ pricing, orderCode, app: upiApp }) : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function verifyRazorpayPaymentSignature(input: RazorpayVerificationInput, secret = env.futureIntegrations.razorpaySecret) {
  if (!secret) return { verified: false, reason: "RAZORPAY_KEY_SECRET is not configured on the server." };
  const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(input.razorpaySignature);

  return {
    verified: actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer),
    reason: "Signature checked with HMAC SHA256.",
  };
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null, secret = env.futureIntegrations.paymentWebhookSecret ?? env.futureIntegrations.razorpaySecret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export function mapRazorpayWebhook(rawBody: string, signature: string | null): RazorpayWebhookResult {
  const verified = verifyRazorpayWebhookSignature(rawBody, signature);
  let event = "unknown";
  let orderReference: string | undefined;
  try {
    const payload = JSON.parse(rawBody) as { event?: string; payload?: { payment?: { entity?: { order_id?: string; notes?: { orderCode?: string } } } } };
    event = payload.event ?? "unknown";
    orderReference = payload.payload?.payment?.entity?.notes?.orderCode ?? payload.payload?.payment?.entity?.order_id;
  } catch {
    return { verified, event, paymentStatus: PaymentStatus.Failed, message: "Webhook body could not be parsed.", orderReference };
  }

  const paymentStatus =
    event === "payment.captured"
      ? PaymentStatus.Succeeded
      : event === "payment.failed"
        ? PaymentStatus.Failed
        : event === "refund.processed"
          ? PaymentStatus.Refunded
          : PaymentStatus.Processing;

  return {
    verified,
    event,
    paymentStatus,
    orderReference,
    message: verified ? "Webhook verified and mapped for reconciliation." : "Webhook received but signature verification failed.",
  };
}

export async function processCommercePayment(transaction: PaymentTransaction, mode: "success" | "failure" | "pending" = "success") {
  await new Promise((resolve) => setTimeout(resolve, transaction.method === "upi" ? 900 : 650));
  const now = new Date().toISOString();

  if (transaction.method === "cod") {
    return {
      ...transaction,
      status: PaymentStatus.CodPending,
      updatedAt: now,
    };
  }

  if (mode === "failure") {
    return {
      ...transaction,
      status: PaymentStatus.Failed,
      updatedAt: now,
      failureReason: transaction.method === "upi" ? "UPI app handoff was interrupted before confirmation." : "Razorpay did not complete this attempt.",
    };
  }

  if (mode === "pending") {
    return {
      ...transaction,
      status: PaymentStatus.Processing,
      updatedAt: now,
      gatewayEvent: "webhook_pending",
    };
  }

  return {
    ...transaction,
    status: PaymentStatus.Succeeded,
    razorpayPaymentId: transaction.razorpayPaymentId ?? transaction.razorpayOrderId.replace("order_", "pay_"),
    updatedAt: now,
    gatewayEvent: "payment.captured",
  };
}
