"use server";

import { z } from "zod";
import { requireUser, requireRole } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { recordOperationalEvent, withTrace } from "@/lib/production/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runFinancialReconciliationSystem } from "@/lib/transactions/payment-reconciliation";
import { createRazorpayOrderPayload, getRazorpayClient, verifyRazorpayPaymentSignature } from "@/features/commerce-finance/razorpay";
import type { Json } from "@/types/database";

const LiveOrderInputSchema = z.object({
  transactionId: z.string().uuid(),
  idempotencyKey: z.string().min(12).max(120).optional(),
});

const VerificationInputSchema = z.object({
  razorpayOrderId: z.string().min(3),
  razorpayPaymentId: z.string().min(3),
  razorpaySignature: z.string().min(16).max(256),
});

const RefundInputSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(4).max(500),
  idempotencyKey: z.string().min(12).max(120),
});

type PaymentAttemptRow = {
  id: string;
  transaction_id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  state: string;
  financial_state?: string;
};

type CheckoutTransactionRow = {
  id: string;
  buyer_id: string;
  payment_method: string;
  payment_reference: string;
  amount_total: number;
  currency: string;
  state: string;
};

function receiptForTransaction(transaction: CheckoutTransactionRow) {
  return `vh_${transaction.payment_reference.replace(/[^a-zA-Z0-9]/g, "").slice(-25)}`.slice(0, 40);
}

function toRupees(paise?: number | string | null) {
  return Math.round(Number(paise ?? 0)) / 100;
}

export async function createLiveRazorpayOrder(input: unknown) {
  const parsed = LiveOrderInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid live payment order request.", parsed.error.flatten());
  }

  const user = await requireUser();
  return withTrace("payment", "payment.razorpay_order", async (trace) => {
  const startedAt = Date.now();
  const supabase = await createSupabaseServerClient();

  const { data: transaction, error: transactionError } = await supabase
    .from("checkout_transactions")
    .select("id,buyer_id,payment_method,payment_reference,amount_total,currency,state")
    .eq("id", parsed.data.transactionId)
    .single();

  if (transactionError || !transaction) {
    throw new AppError("DATABASE_ERROR", "Checkout transaction was not found for payment creation.", transactionError);
  }

  const checkout = transaction as CheckoutTransactionRow;
  if (checkout.buyer_id !== user.id) {
    throw new AppError("FORBIDDEN", "You cannot create a payment order for this checkout.");
  }

  if (checkout.payment_method === "cod") {
    throw new AppError("VALIDATION_ERROR", "COD transactions do not create Razorpay orders.");
  }

  if (checkout.currency !== "INR" || checkout.amount_total <= 0) {
    throw new AppError("VALIDATION_ERROR", "Payment amount or currency is not valid for Razorpay.");
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("id,transaction_id,provider_order_id,provider_payment_id,amount,currency,state")
    .eq("transaction_id", checkout.id)
    .single();

  if (attemptError || !attempt) {
    throw new AppError("DATABASE_ERROR", "Payment attempt was not found for this checkout.", attemptError);
  }

  const paymentAttempt = attempt as PaymentAttemptRow;
  if (paymentAttempt.amount !== checkout.amount_total || paymentAttempt.currency !== checkout.currency) {
    throw new AppError("VALIDATION_ERROR", "Payment amount does not match the locked checkout transaction.");
  }

  const receipt = receiptForTransaction(checkout);
  const notes = {
    transactionId: checkout.id,
    paymentAttemptId: paymentAttempt.id,
    paymentReference: checkout.payment_reference,
    buyerId: user.id,
    idempotencyKey: parsed.data.idempotencyKey ?? checkout.payment_reference,
    source: "vendorhub_phase_22",
    traceId: trace.traceId,
    correlationId: trace.correlationId ?? trace.traceId,
  };

  const payload = createRazorpayOrderPayload({
    amount: checkout.amount_total,
    currency: "INR",
    receipt,
    notes,
  });

  const order = await getRazorpayClient().orders.create(payload);
  const providerOrder = order as {
    id: string;
    status?: string;
    amount_due?: number | string;
    amount_paid?: number | string;
    created_at?: number;
  };

  const { data: registered, error: registerError } = await supabase.rpc("register_live_razorpay_order", {
    target_transaction_id: checkout.id,
    razorpay_order_id: providerOrder.id,
    receipt,
    provider_status: providerOrder.status ?? "created",
    amount_due: toRupees(providerOrder.amount_due),
    amount_paid: toRupees(providerOrder.amount_paid),
    provider_created_at: providerOrder.created_at ? new Date(providerOrder.created_at * 1000).toISOString() : new Date().toISOString(),
    raw_provider_payload: order as unknown as Json,
  });

  if (registerError) {
    recordOperationalEvent("error", "payment.razorpay_order.register_failed", {
      transactionId: checkout.id,
      providerOrderId: providerOrder.id,
    }, { domain: "payment", trace, subjectId: checkout.id, error: registerError });
    throw new AppError("DATABASE_ERROR", "Razorpay order was created but could not be registered for reconciliation.", registerError);
  }

  recordOperationalEvent("info", "payment.razorpay_order.created", {
    latencyMs: Date.now() - startedAt,
    transactionId: checkout.id,
    providerOrderId: providerOrder.id,
    amount: checkout.amount_total,
  }, { domain: "payment", trace, subjectId: checkout.id });

  return {
    provider: "razorpay",
    keyId: env.futureIntegrations.razorpayPublicKeyId ?? env.futureIntegrations.razorpayKeyId,
    order: {
      id: providerOrder.id,
      amount: payload.amount,
      currency: payload.currency,
      receipt,
      status: providerOrder.status ?? "created",
    },
    reconciliation: registered,
  };
  }, { transactionId: parsed.data.transactionId, actorId: user.id });
}

export async function recordServerPaymentVerification(input: unknown) {
  const parsed = VerificationInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid payment verification payload.", parsed.error.flatten());
  }

  await requireUser();
  return withTrace("payment", "payment.signature_verification", async (trace) => {
  const result = verifyRazorpayPaymentSignature(parsed.data);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_payment_signature_verification", {
    razorpay_order_id: parsed.data.razorpayOrderId,
    razorpay_payment_id: parsed.data.razorpayPaymentId,
    razorpay_signature: parsed.data.razorpaySignature,
    signature_valid: result.verified,
    raw_verification_payload: parsed.data as Json,
  });

  if (error) {
    recordOperationalEvent("error", "payment.signature.record_failed", {
      razorpayOrderId: parsed.data.razorpayOrderId,
      verified: result.verified,
    }, { domain: "payment", trace, error });
    throw new AppError("DATABASE_ERROR", "Payment signature verification could not be recorded.", error);
  }

  recordOperationalEvent(result.verified ? "info" : "warn", "payment.signature.verified", {
    razorpayOrderId: parsed.data.razorpayOrderId,
    verified: result.verified,
  }, { domain: "payment", trace });

  return {
    verified: result.verified,
    authority: "webhook_capture_required",
    message: result.verified ? "Signature verified. Final payment capture waits for Razorpay webhook reconciliation." : result.reason,
    reconciliation: data,
  };
  }, { razorpayOrderId: parsed.data.razorpayOrderId });
}

export async function requestAndInitiateRefund(input: unknown) {
  const parsed = RefundInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid refund request.", parsed.error.flatten());
  }

  await requireUser();
  return withTrace("refund", "refund.initiation", async (trace) => {
  const supabase = await createSupabaseServerClient();
  const { data: requestResult, error: requestError } = await supabase.rpc("request_order_refund", {
    target_order_id: parsed.data.orderId,
    refund_amount: parsed.data.amount,
    refund_reason: parsed.data.reason,
    refund_idempotency_key: parsed.data.idempotencyKey,
  });

  if (requestError) {
    recordOperationalEvent("error", "refund.request.register_failed", {
      orderId: parsed.data.orderId,
      amount: parsed.data.amount,
    }, { domain: "refund", trace, error: requestError });
    throw new AppError("DATABASE_ERROR", "Refund request could not be registered.", requestError);
  }

  const refundId = typeof requestResult === "object" && requestResult && "refundId" in requestResult ? String(requestResult.refundId) : undefined;
  const admin = createSupabaseAdminClient();
  const { data: order, error: orderError } = await admin.from("orders").select("metadata,total_amount,currency").eq("id", parsed.data.orderId).single();

  if (orderError || !order || !refundId) {
    recordOperationalEvent("error", "refund.context.load_failed", {
      orderId: parsed.data.orderId,
      refundId,
    }, { domain: "refund", trace, error: orderError });
    throw new AppError("DATABASE_ERROR", "Refund was requested but provider initiation could not load order context.", orderError);
  }

  const metadata = order.metadata as { checkout_transaction_id?: string } | null;
  const transactionId = metadata?.checkout_transaction_id;
  const { data: attempt, error: attemptError } = await admin
    .from("payment_attempts")
    .select("id,transaction_id,provider_payment_id,amount,currency,state")
    .eq("transaction_id", transactionId ?? "")
    .single();

  if (attemptError || !attempt) {
    await admin.from("refund_requests").update({ state: "REFUND_RECONCILING", failure_reason: "PAYMENT_ATTEMPT_NOT_FOUND" } as never).eq("id", refundId);
    recordOperationalEvent("warn", "refund.reconciliation_required", {
      refundId,
      orderId: parsed.data.orderId,
      reason: "PAYMENT_ATTEMPT_NOT_FOUND",
    }, { domain: "refund", trace, error: attemptError });
    throw new AppError("DATABASE_ERROR", "Refund requires reconciliation because the payment attempt was not found.", attemptError);
  }

  const paymentAttempt = attempt as PaymentAttemptRow;
  if (!paymentAttempt.provider_payment_id) {
    await admin.from("refund_requests").update({ state: "REFUND_RECONCILING", failure_reason: "PROVIDER_PAYMENT_ID_MISSING" } as never).eq("id", refundId);
    recordOperationalEvent("warn", "refund.provider_payment_missing", {
      refundId,
      orderId: parsed.data.orderId,
      transactionId,
    }, { domain: "refund", trace });
    return { refundId, state: "REFUND_RECONCILING", message: "Refund is queued until the provider payment id is reconciled." };
  }

  try {
    await admin.from("refund_requests").update({ state: "REFUND_INITIATED" } as never).eq("id", refundId);
    const refund = await getRazorpayClient().payments.refund(paymentAttempt.provider_payment_id, {
      amount: Math.round(parsed.data.amount * 100),
      speed: "normal",
      receipt: parsed.data.idempotencyKey.slice(0, 40),
      notes: {
        refundId,
        orderId: parsed.data.orderId,
        source: "vendorhub_phase_22",
        traceId: trace.traceId,
      },
    });

    await admin
      .from("refund_requests")
      .update({
        state: refund.status === "processed" ? "REFUND_SUCCEEDED" : "REFUND_PROCESSING",
        provider_refund_id: refund.id,
        raw_payload: refund as unknown as Json,
        completed_at: refund.status === "processed" ? new Date().toISOString() : null,
      } as never)
      .eq("id", refundId);

    let accountingAdjustment: unknown = null;
    if (refund.status === "processed") {
      const { data: adjustment, error: adjustmentError } = await admin.rpc("post_refund_financial_adjustment", {
        target_refund_id: refundId,
        source_event_id: `refund:${refund.id}:processed`,
      });

      if (adjustmentError) {
        await admin.from("refund_requests").update({ state: "REFUND_RECONCILING", failure_reason: "REFUND_ACCOUNTING_ADJUSTMENT_FAILED" } as never).eq("id", refundId);
        recordOperationalEvent("error", "refund.accounting_adjustment_failed", {
          refundId,
          orderId: parsed.data.orderId,
          providerRefundId: refund.id,
        }, { domain: "refund", trace, subjectId: refundId, error: adjustmentError });
      } else {
        accountingAdjustment = adjustment;
      }
    }

    recordOperationalEvent("info", "refund.provider_initiated", {
      refundId,
      orderId: parsed.data.orderId,
      providerRefundId: refund.id,
      state: refund.status,
    }, { domain: "refund", trace, subjectId: refundId });

    return { refundId, state: refund.status === "processed" ? "REFUND_SUCCEEDED" : "REFUND_PROCESSING", providerRefundId: refund.id, accountingAdjustment };
  } catch (error) {
    await admin
      .from("refund_requests")
      .update({ state: "REFUND_FAILED", failure_reason: error instanceof Error ? error.message : "Razorpay refund initiation failed." } as never)
      .eq("id", refundId);
    recordOperationalEvent("error", "refund.provider_failed", {
      refundId,
      orderId: parsed.data.orderId,
      amount: parsed.data.amount,
    }, { domain: "refund", trace, subjectId: refundId, error });
    throw new AppError("DATABASE_ERROR", "Refund request was recorded but Razorpay refund initiation failed.", error);
  }
  }, { orderId: parsed.data.orderId, amount: parsed.data.amount });
}

export async function runFinancialReconciliationAction(batchSize = 100) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  return runFinancialReconciliationSystem(batchSize);
}
