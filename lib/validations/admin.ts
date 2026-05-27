import { z } from "zod";
import { PRODUCT_STATUSES, VENDOR_STATUSES } from "@/lib/constants/marketplace";
import { UuidSchema } from "./common";

export const VendorModerationSchema = z.object({
  vendorId: UuidSchema,
  status: z.enum(VENDOR_STATUSES),
  note: z.string().max(500).optional(),
});

export const ProductModerationSchema = z.object({
  productId: UuidSchema,
  status: z.enum(PRODUCT_STATUSES),
  note: z.string().max(500).optional(),
});
