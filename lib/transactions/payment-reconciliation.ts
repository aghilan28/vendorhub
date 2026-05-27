"use server";

import crypto from "crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { recordOperationalEvent, withTrace } from "@/lib/production/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpayWebhookSignature } from "@/features/commerce-finance/razorpay";
import type { Json } from "@/types/database";

const RazorpayWebhookEntitySchema = z.object({
  id: z.string().optional(),
  order_id: z.string().optional(),
  error_description: z.string().optional(),
});

const RazorpayWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z
    .object({
      payment: z.object({ entity: RazorpayWebhookEntitySchema }).optional(),
      order: z.object({ entity: RazorpayWebhookEntitySchema }).optional(),
      refund: z.object({ entity: RazorpayWebhookEntitySchema }).optional(),
    })
    .optional(),
});

export async function reconcileRazorpayWebhook(rawBody: string, signature: string | null) {
  return reconcileRazorpayWebhookSystem(rawBody, signature);
}

export async function reconcileRazorpayWebhookSystem(rawBody: string, signature: string | null) {
  return withTrace("reconciliation", "payment.webhook.reconciliation", async (trace) => {
  const signatureValid = verifyRazorpayWebhookSignature(rawBody, signature);
  const parsedJson = JSON.parse(rawBody) as Json;
  const parsed = RazorpayWebhookSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid Razorpay webhook payload.", parsed.error.flatten());
  }

  const entity = parsed.data.payload?.payment?.entity ?? parsed.data.payload?.order?.entity ?? parsed.data.payload?.refund?.entity;
  const providerOrderId = entity?.order_id ?? entity?.id;
  const providerPaymentId = parsed.data.payload?.payment?.entity?.id;
  const eventId = crypto.createHash("sha256").update(`${parsed.data.event}:${providerOrderId ?? "unknown"}:${providerPaymentId ?? ""}:${rawBody}`).digest("hex");

  if (!providerOrderId) {
    recordOperationalEvent("warn", "payment.webhook.provider_order_missing", {
      event: parsed.data.event,
    }, { domain: "reconciliation", trace });
    throw new AppError("VALIDATION_ERROR", "Webhook payload does not contain a provider order id.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reconcile_payment_webhook", {
    provider_name: "razorpay",
    event_id: eventId,
    event_type: parsed.data.event,
    provider_order_id: providerOrderId,
    provider_payment_id: providerPaymentId ?? null,
    signature_valid: signatureValid,
    raw_payload: parsedJson,
  });

  if (error) {
    recordOperationalEvent("error", "payment.webhook.reconcile_failed", {
      providerOrderId,
      event: parsed.data.event,
      signatureValid,
    }, { domain: "reconciliation", trace, error });
    throw new AppError("DATABASE_ERROR", "Payment webhook reconciliation failed.", error);
  }

  if (!signatureValid && env.futureIntegrations.paymentWebhookSecret) {
    recordOperationalEvent("warn", "payment.webhook.invalid_signature", {
      providerOrderId,
      event: parsed.data.event,
    }, { domain: "security", trace });
  }

  recordOperationalEvent("info", "payment.webhook.reconciled", {
    providerOrderId,
    event: parsed.data.event,
    signatureValid,
    providerPaymentId: providerPaymentId ?? null,
  }, { domain: "reconciliation", trace });

  return data;
  }, { rawBodyBytes: rawBody.length, hasSignature: Boolean(signature) });
}

export async function runFinancialReconciliationSystem(batchSize = 100) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("run_financial_reconciliation", { batch_size: batchSize });

  if (error) {
    recordOperationalEvent("error", "payment.reconciliation.failed", {
      batchSize,
    }, { domain: "reconciliation", error });
    throw new AppError("DATABASE_ERROR", "Financial reconciliation failed.", error);
  }

  recordOperationalEvent("info", "payment.reconciliation.completed", {
    batchSize,
  }, { domain: "reconciliation" });

  return data;
}
