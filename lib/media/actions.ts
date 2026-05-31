"use server";

// MCP-0A — Media server actions (real Supabase Storage integration)
// Uploads product media to Storage, records it in `product_images`, and keeps
// gallery ordering consistent. Role-gated; throws AppError on failure.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { productImagePath, validateUpload } from "@/lib/media";
import type { BucketId } from "@/lib/media";

const SELLER_ROLES = ["SELLER", "ADMIN", "SUPER_ADMIN"] as const;

function extForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[mime.toLowerCase()] ?? "bin";
}

export interface UploadResult {
  id: string;
  path: string;
  url: string;
  isPrimary: boolean;
}

/**
 * Uploads a single product image. Expects FormData with `file` and `productId`.
 * Validates against bucket policy, stores under a deterministic path, and
 * inserts a `product_images` row (primary if it is the first image).
 */
export async function uploadProductMediaAction(formData: FormData): Promise<UploadResult> {
  await requireRole([...SELLER_ROLES]);

  const file = formData.get("file");
  const productId = String(formData.get("productId") ?? "");
  const altText = String(formData.get("altText") ?? "");

  if (!(file instanceof Blob)) throw new AppError("VALIDATION_ERROR", "No file provided.");
  if (!productId) throw new AppError("VALIDATION_ERROR", "productId is required.");

  const filename = (file as File).name ?? "upload";
  const mime = file.type || "application/octet-stream";
  const bucket = env.storage.productImagesBucket as BucketId;

  const validation = validateUpload({ filename, mime, bytes: file.size }, bucket);
  if (!validation.ok) {
    throw new AppError("VALIDATION_ERROR", `Invalid upload: ${validation.errors.join(", ")}`, validation.errors);
  }

  const supabase = await createSupabaseServerClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,vendor_id")
    .eq("id", productId)
    .single();
  if (productError || !product) throw new AppError("NOT_FOUND", "Product not found.", productError);

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  const existing = count ?? 0;

  const assetId = randomUUID();
  const path = productImagePath({
    vendorId: (product as { vendor_id: string }).vendor_id,
    productId,
    assetId,
    ext: extForMime(mime),
  });

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: mime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (uploadError) throw new AppError("DATABASE_ERROR", "Storage upload failed.", uploadError);

  const isPrimary = existing === 0;
  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: path,
    alt_text: altText || null,
    sort_order: existing,
    is_primary: isPrimary,
  } as never);
  if (insertError) {
    await supabase.storage.from(bucket).remove([path]);
    throw new AppError("DATABASE_ERROR", "Failed to record media.", insertError);
  }

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
  revalidatePath("/seller/products");
  revalidatePath("/seller/media");

  return { id: assetId, path, url: publicUrl.publicUrl, isPrimary };
}

/** Deletes a product image (storage object + row). */
export async function deleteProductMediaAction(input: { imageId: string; productId: string }): Promise<{ ok: true }> {
  await requireRole([...SELLER_ROLES]);
  const supabase = await createSupabaseServerClient();
  const bucket = env.storage.productImagesBucket as BucketId;

  const { data: image, error } = await supabase
    .from("product_images")
    .select("id,storage_path")
    .eq("id", input.imageId)
    .single();
  if (error || !image) throw new AppError("NOT_FOUND", "Image not found.", error);

  const storagePath = (image as { storage_path: string }).storage_path;
  if (storagePath && !/^https?:\/\//i.test(storagePath)) {
    await supabase.storage.from(bucket).remove([storagePath]);
  }
  const { error: delError } = await supabase.from("product_images").delete().eq("id", input.imageId);
  if (delError) throw new AppError("DATABASE_ERROR", "Failed to delete media.", delError);

  revalidatePath("/seller/media");
  revalidatePath("/seller/products");
  return { ok: true };
}

/** Reorders a product's gallery and sets the primary image. */
export async function reorderProductMediaAction(input: {
  productId: string;
  orderedImageIds: string[];
}): Promise<{ ok: true }> {
  await requireRole([...SELLER_ROLES]);
  if (input.orderedImageIds.length === 0) throw new AppError("VALIDATION_ERROR", "No order provided.");
  const supabase = await createSupabaseServerClient();

  await Promise.all(
    input.orderedImageIds.map((id, index) =>
      supabase
        .from("product_images")
        .update({ sort_order: index, is_primary: index === 0 } as never)
        .eq("id", id)
        .eq("product_id", input.productId),
    ),
  );

  revalidatePath("/seller/media");
  revalidatePath("/seller/products");
  return { ok: true };
}
