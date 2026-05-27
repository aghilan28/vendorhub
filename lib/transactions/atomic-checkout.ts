"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { recordOperationalEvent, withTrace } from "@/lib/production/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CheckoutAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  recipient: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(3),
  locality: z.string().min(2),
  city: z.string().min(2),
  pincode: z.string().min(4),
  instructions: z.string().max(500).optional(),
});

const AtomicCheckoutSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  deliveryAddress: CheckoutAddressSchema,
  paymentMethod: z.enum(["upi", "cod", "card", "netbanking", "wallet"]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AtomicCheckoutInput = z.infer<typeof AtomicCheckoutSchema>;

export type AtomicCheckoutResult = {
  transactionId: string;
  state: "PAYMENT_PENDING" | "FULFILLMENT_PENDING";
  orderIds: string[];
  orderNumbers: string[];
  payment: {
    provider: "razorpay";
    providerOrderId: string;
    reference: string;
    status: "INTENT_CREATED" | "COD_PENDING";
    amount: number;
    currency: "INR";
  };
  realtimeOutboxPending: boolean;
};

export async function atomicCheckoutAction(input: unknown): Promise<AtomicCheckoutResult> {
  const parsed = AtomicCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    recordOperationalEvent("warn", "checkout.atomic.validation_failed", {
      issues: parsed.error.issues.length,
    }, { domain: "checkout" });
    throw new AppError("VALIDATION_ERROR", "Invalid atomic checkout payload.", parsed.error.flatten());
  }

  await requireUser();
  return withTrace("checkout", "checkout.atomic", async (trace) => {
    const startedAt = Date.now();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("atomic_checkout", {
      checkout_idempotency_key: parsed.data.idempotencyKey,
      delivery_address: parsed.data.deliveryAddress,
      payment_method: parsed.data.paymentMethod,
      checkout_metadata: { ...parsed.data.metadata, traceId: trace.traceId, correlationId: trace.correlationId },
    });

    if (error) {
      recordOperationalEvent("warn", "checkout.atomic.rpc_failed", {
        code: error.code ?? "RPC_ERROR",
        latencyMs: Date.now() - startedAt,
        paymentMethod: parsed.data.paymentMethod,
      }, {
        domain: "checkout",
        trace,
        error,
      });
      throw new AppError("DATABASE_ERROR", "Checkout could not be completed safely. No inventory or payment state was partially committed.", error);
    }

    const result = data as AtomicCheckoutResult;
    recordOperationalEvent("info", "checkout.atomic.state_transition", {
      transactionId: result.transactionId,
      state: result.state,
      orderCount: result.orderIds.length,
      paymentStatus: result.payment.status,
      realtimeOutboxPending: result.realtimeOutboxPending,
      latencyMs: Date.now() - startedAt,
    }, { domain: "checkout", trace, subjectId: result.transactionId });

    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/seller/orders");

    return result;
  }, {
    paymentMethod: parsed.data.paymentMethod,
    idempotencyKeyLength: parsed.data.idempotencyKey.length,
  });
}

export async function releaseExpiredReservationsAction() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("release_expired_inventory_reservations", { batch_size: 100 });

  if (error) {
    recordOperationalEvent("error", "checkout.reservations.release_failed", {
      batchSize: 100,
    }, { domain: "checkout", error });
    throw new AppError("DATABASE_ERROR", "Unable to release expired reservations.", error);
  }

  recordOperationalEvent("info", "checkout.reservations.released", {
    batchSize: 100,
  }, { domain: "checkout" });

  return data;
}
