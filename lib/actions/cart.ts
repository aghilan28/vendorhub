"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CartItemSchema } from "@/lib/validations/cart";

export async function upsertCartItemAction(input: unknown) {
  const parsed = CartItemSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid cart item payload.", parsed.error.flatten());
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("upsert_live_cart_item", {
    target_product_id: parsed.data.product_id,
    target_variant_id: parsed.data.variant_id ?? null,
    target_quantity: parsed.data.quantity,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to update cart item.", error);
  }

  revalidatePath("/home");
  revalidatePath("/cart");
  revalidatePath("/checkout");

  return { ok: true, userId: user.id };
}

export async function removeCartItemAction(id: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remove_live_cart_item", { target_cart_item_id: id });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to remove cart item.", error);
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");

  return { ok: true, userId: user.id };
}

export async function clearCartAction() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("clear_live_cart");

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to clear cart.", error);
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");

  return { ok: true, userId: user.id };
}
