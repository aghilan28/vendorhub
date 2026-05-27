import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/constants/marketplace";

export const ImageUploadSchema = z.object({
  bucket: z.enum([STORAGE_BUCKETS.productImages, STORAGE_BUCKETS.vendorAssets, STORAGE_BUCKETS.profileImages]),
  path: z.string().min(2),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z.number().int().positive().max(8 * 1024 * 1024),
});
