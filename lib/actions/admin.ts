"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductModerationSchema, VendorModerationSchema } from "@/lib/validations/admin";

export async function moderateVendorAction(input: unknown) {
  const parsed = VendorModerationSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid vendor moderation payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("moderate_live_vendor", {
    target_vendor_id: parsed.data.vendorId,
    target_status: parsed.data.status,
    moderation_note: parsed.data.note ?? null,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to moderate vendor.", error);
  }

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/dashboard");
  revalidatePath("/seller/dashboard");

  return { ok: true };
}

export async function moderateProductAction(input: unknown) {
  const parsed = ProductModerationSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid product moderation payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("moderate_live_product", {
    target_product_id: parsed.data.productId,
    target_status: parsed.data.status,
    moderation_note: parsed.data.note ?? null,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to moderate product.", error);
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/seller/products");
  revalidatePath("/home");

  return { ok: true };
}
