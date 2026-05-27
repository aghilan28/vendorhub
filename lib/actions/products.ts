"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { enqueueAsyncJob, idempotencyKeyFor } from "@/lib/async/orchestrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InventoryStockUpdateSchema, ProductCreateWithImagesSchema, ProductUpdateWithImagesSchema } from "@/lib/validations/products";
import type { Database } from "@/types/database";

type ProductImageInput = Omit<Database["public"]["Tables"]["product_images"]["Insert"], "product_id">;

export async function createProductAction(input: unknown) {
  const parsed = ProductCreateWithImagesSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid product payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { images, ...productInput } = parsed.data;
  const { data: product, error } = await supabase.from("products").insert(productInput as any).select("id,vendor_id,updated_at").single();

  if (error || !product) {
    throw new AppError("DATABASE_ERROR", "Unable to create product.", error);
  }

  if (images.length) {
    const { error: imageError } = await supabase.from("product_images").insert(
      images.map((image: ProductImageInput) => ({
        ...image,
        product_id: product.id,
      })) as any,
    );
    if (imageError) throw new AppError("DATABASE_ERROR", "Unable to attach product images.", imageError);
  }

  await enqueueAsyncJob({
    name: "ai.embedding.refresh",
    payload: { productId: product.id },
    idempotencyKey: idempotencyKeyFor(["product-create-embedding", product.id, product.updated_at]),
    priority: "normal",
    metadata: { vendorId: product.vendor_id, source: "seller_product_create" },
  });

  revalidatePath("/seller/products");
  return { id: product.id };
}

export async function updateProductAction(id: string, input: unknown) {
  const parsed = ProductUpdateWithImagesSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid product payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { images, ...productInput } = parsed.data;
  const updatePayload = { ...productInput, updated_at: new Date().toISOString() };
  const { data: product, error } = await supabase.from("products").update(updatePayload as any).eq("id", id).select("id,vendor_id,updated_at").single();

  if (error || !product) {
    throw new AppError("DATABASE_ERROR", "Unable to update product.", error);
  }

  if (images) {
    const { error: deleteImagesError } = await supabase.from("product_images").delete().eq("product_id", id);
    if (deleteImagesError) throw new AppError("DATABASE_ERROR", "Unable to replace product images.", deleteImagesError);
    if (images.length) {
      const { error: imageError } = await supabase.from("product_images").insert(
        images.map((image: ProductImageInput) => ({
          ...image,
          product_id: id,
        })) as any,
      );
      if (imageError) throw new AppError("DATABASE_ERROR", "Unable to attach product images.", imageError);
    }
  }

  await enqueueAsyncJob({
    name: "ai.embedding.refresh",
    payload: { productId: id },
    idempotencyKey: idempotencyKeyFor(["product-update-embedding", id, product.updated_at]),
    priority: "normal",
    metadata: { vendorId: product.vendor_id, source: "seller_product_update" },
  });

  revalidatePath("/seller/products");
  return { id };
}

export async function archiveProductAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const archivePayload: Database["public"]["Tables"]["products"]["Update"] = { status: "ARCHIVED", deleted_at: new Date().toISOString() };
  const { error } = await supabase
    .from("products")
    .update(archivePayload as any)
    .eq("id", id);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to archive product.", error);
  }

  revalidatePath("/seller/products");
  return { id, archived: true };
}

export async function updateInventoryStockAction(input: unknown) {
  const parsed = InventoryStockUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid inventory update payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_live_inventory", {
    target_inventory_id: parsed.data.inventoryId,
    target_stock_quantity: parsed.data.stockQuantity,
    reason: parsed.data.reason,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to update inventory stock.", error);
  }

  revalidatePath("/seller/inventory");
  revalidatePath("/seller/dashboard");
  revalidatePath("/home");

  return { ok: true };
}
