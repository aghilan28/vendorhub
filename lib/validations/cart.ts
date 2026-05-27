import { z } from "zod";
import { UuidSchema } from "./common";

export const CartItemSchema = z.object({
  product_id: UuidSchema,
  variant_id: UuidSchema.nullish(),
  quantity: z.number().int().min(1).max(99),
  reserved_until: z.string().datetime().nullable().optional(),
});

export type CartItemInput = z.infer<typeof CartItemSchema>;
