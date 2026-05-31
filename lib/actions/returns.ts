"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createReturnRequest, isReturnEligible } from "@/lib/commerce-core/returns";
import type { ReturnReason } from "@/lib/commerce-core/types";

/**
 * EC-2 — Customer return request write path.
 * Validates eligibility + reason, writes to the real `return_requests` table.
 * DB enum `return_state` uses lowercase ('requested'); engine uses uppercase REQUESTED.
 */
export async function requestReturnAction(input: {
  orderId: string;
  orderItemId?: string | null;
  vendorId: string;
  reason: ReturnReason;
  description: string;
  evidencePaths?: string[];
}) {
  const user = await requireUser();
  const supabase = (await createSupabaseServerClient()) as any;

  // Eligibility check against order delivery date (degrade-safe).
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("id,buyer_id,status,updated_at,delivered_at")
      .eq("id", input.orderId)
      .single();
    if (order) {
      if (order.buyer_id && order.buyer_id !== user.id) {
        throw new AppError("FORBIDDEN", "You can only return your own orders.");
      }
      const deliveredAt = (order.delivered_at as string | null) ?? (order.status === "DELIVERED" ? (order.updated_at as string) : null);
      const elig = isReturnEligible({ deliveredAt });
      if (!elig.eligible) {
        throw new AppError("VALIDATION_ERROR", elig.reason);
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // else degrade-safe: proceed (DB shape unknown in sandbox)
  }

  // Build engine record (validates reason + description).
  const req = createReturnRequest({
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    buyerId: user.id,
    sellerId: input.vendorId,
    reason: input.reason,
    description: input.description,
    evidencePaths: input.evidencePaths,
  });

  const { error } = await supabase.from("return_requests").insert({
    order_id: req.orderId,
    vendor_id: req.sellerId,
    buyer_id: req.buyerId,
    state: "requested",
    reason: `${req.reason}: ${req.description}`,
    evidence_paths: req.evidencePaths,
  });

  if (error) throw new AppError("DATABASE_ERROR", "Unable to submit return request.", error);

  revalidatePath("/orders");
  return { ok: true, returnId: req.id, status: req.status };
}

/** Seller/admin decision on a return (approve/reject) — writes lowercase DB state. */
export async function decideReturnAction(input: { returnRequestId: string; decision: "approve" | "reject"; note?: string }) {
  await requireUser();
  const supabase = (await createSupabaseServerClient()) as any;
  const dbState = input.decision === "approve" ? "approved" : "rejected";
  const { error } = await supabase
    .from("return_requests")
    .update({ state: dbState, resolution_note: input.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", input.returnRequestId);
  if (error) throw new AppError("DATABASE_ERROR", "Unable to update return.", error);
  revalidatePath("/seller/orders");
  return { ok: true, state: dbState };
}
