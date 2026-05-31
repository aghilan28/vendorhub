"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { containsLinks, validateReview } from "@/lib/commerce-core/reviews";
import type { ReviewSubmission } from "@/lib/commerce-core/types";

/**
 * EC-2 — Review submission write path.
 * Validates, enforces verified-purchase + fraud heuristics, writes to the real `reviews` table.
 */
export async function submitReviewAction(input: ReviewSubmission) {
  const user = await requireUser();
  const supabase = (await createSupabaseServerClient()) as any;

  // Verified purchase: has the user a delivered/completed order item for this product?
  let isVerifiedPurchase = false;
  let duplicateForProduct = false;
  let customerReviewCount30Days = 0;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: existing }, { count: recentCount }, { data: purchase }] = await Promise.all([
      supabase.from("reviews").select("id").eq("user_id", user.id).eq("product_id", input.productId).limit(1),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
      supabase
        .from("order_items")
        .select("id, order:orders!inner(buyer_id,status)")
        .eq("product_id", input.productId)
        .eq("order.buyer_id", user.id)
        .in("order.status", ["DELIVERED", "COMPLETED"])
        .limit(1),
    ]);
    duplicateForProduct = Boolean(existing && existing.length > 0);
    customerReviewCount30Days = recentCount ?? 0;
    isVerifiedPurchase = Boolean(purchase && purchase.length > 0);
  } catch {
    // Degrade-safe: if DB shape differs, proceed with conservative defaults (unverified).
  }

  const validation = validateReview(input, {
    isVerifiedPurchase,
    customerReviewCount30Days,
    duplicateForProduct,
    bodyContainsLinks: containsLinks(input.body ?? ""),
  });

  if (!validation.valid) {
    throw new AppError("VALIDATION_ERROR", validation.errors.join("; "), validation.errors);
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    product_id: input.productId,
    order_item_id: input.orderItemId ?? null,
    rating: input.rating,
    title: input.title.trim(),
    body: input.body.trim(),
    is_verified_purchase: validation.isVerifiedPurchase,
    moderation_status: validation.recommendedModeration,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to submit review.", error);
  }

  revalidatePath(`/product`);
  return { ok: true, moderation: validation.recommendedModeration, verified: validation.isVerifiedPurchase, fraudScore: validation.fraudScore };
}

/** Seller response to a review (writes to review_responses). */
export async function respondToReviewAction(input: { reviewId: string; vendorId: string; body: string }) {
  await requireUser();
  if (!input.body || input.body.trim().length < 5) {
    throw new AppError("VALIDATION_ERROR", "Response must be at least 5 characters.");
  }
  const supabase = (await createSupabaseServerClient()) as any;
  const { error } = await supabase.from("review_responses").upsert(
    { review_id: input.reviewId, vendor_id: input.vendorId, body: input.body.trim() },
    { onConflict: "review_id" },
  );
  if (error) throw new AppError("DATABASE_ERROR", "Unable to post response.", error);
  return { ok: true };
}

/** Report a review for moderation (writes to review_reports). */
export async function reportReviewAction(input: { reviewId: string; reason: string }) {
  const user = await requireUser();
  const supabase = (await createSupabaseServerClient()) as any;
  const { error } = await supabase.from("review_reports").insert({
    review_id: input.reviewId,
    reporter_id: user.id,
    reason: input.reason,
  });
  if (error) throw new AppError("DATABASE_ERROR", "Unable to report review.", error);
  return { ok: true };
}
