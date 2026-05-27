"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UuidSchema } from "@/lib/validations/common";

export async function toggleWishlistAction(productId: string) {
  const parsed = UuidSchema.safeParse(productId);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid wishlist product id.", parsed.error.flatten());
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("toggle_live_wishlist", { target_product_id: parsed.data });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to update wishlist.", error);
  }

  revalidatePath("/wishlist");
  revalidatePath("/home");
  revalidatePath("/search");

  return { ok: true, userId: user.id, result: data };
}
