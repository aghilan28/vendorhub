import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/constants/marketplace";
import { AddressSnapshotSchema, MoneySchema, UuidSchema } from "./common";

export const OrderItemCreateSchema = z.object({
  product_id: UuidSchema,
  variant_id: UuidSchema.nullish(),
  vendor_id: UuidSchema,
  product_name: z.string().min(2),
  variant_name: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: MoneySchema,
  total_price: MoneySchema,
});

export const OrderCreateSchema = z.object({
  buyer_id: UuidSchema,
  vendor_id: UuidSchema,
  order_number: z.string().min(6).max(40),
  status: z.enum(ORDER_STATUSES).default("PENDING"),
  subtotal_amount: MoneySchema,
  tax_amount: MoneySchema.default(0),
  delivery_fee_amount: MoneySchema.default(0),
  discount_amount: MoneySchema.default(0),
  total_amount: MoneySchema,
  currency: z.string().length(3).default("INR"),
  payment_status: z.string().default("NOT_STARTED"),
  delivery_address: AddressSnapshotSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const OrderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(1000).optional(),
});

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderStatusUpdateInput = z.infer<typeof OrderStatusUpdateSchema>;
