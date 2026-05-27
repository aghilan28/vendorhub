import { z } from "zod";
import { PRODUCT_STATUSES, STOCK_STATUSES } from "@/lib/constants/marketplace";
import { MoneySchema, SlugSchema, UuidSchema } from "./common";

export const ProductCreateSchema = z.object({
  vendor_id: UuidSchema,
  category_id: UuidSchema,
  name: z.string().min(2).max(180),
  slug: SlugSchema,
  description: z.string().max(4000).optional(),
  status: z.enum(PRODUCT_STATUSES).default("DRAFT"),
  base_price: MoneySchema,
  currency: z.string().length(3).default("INR"),
  ai_index_metadata: z.record(z.string(), z.unknown()).default({}),
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  published_at: z.string().datetime().nullable().optional(),
});

export const ProductImageSchema = z.object({
  product_id: UuidSchema.optional(),
  storage_path: z.string().min(2),
  alt_text: z.string().max(180).optional(),
  sort_order: z.number().int().nonnegative().default(0),
  is_primary: z.boolean().default(false),
});

export const ProductVariantSchema = z.object({
  product_id: UuidSchema,
  sku: z.string().min(2).max(80),
  name: z.string().min(1).max(120),
  attributes: z.record(z.string(), z.unknown()).default({}),
  price_delta: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const InventorySchema = z.object({
  vendor_id: UuidSchema,
  product_id: UuidSchema,
  variant_id: UuidSchema.nullish(),
  stock_quantity: z.number().int().nonnegative(),
  reserved_quantity: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().nonnegative().default(5),
  stock_status: z.enum(STOCK_STATUSES).default("IN_STOCK"),
});

export const InventoryStockUpdateSchema = z.object({
  inventoryId: UuidSchema,
  stockQuantity: z.number().int().nonnegative(),
  reason: z.string().min(2).max(240).default("seller_adjustment"),
});

export const ProductCreateWithImagesSchema = ProductCreateSchema.extend({
  images: z.array(ProductImageSchema.omit({ product_id: true })).max(12).default([]),
});

export const ProductUpdateWithImagesSchema = ProductUpdateSchema.extend({
  images: z.array(ProductImageSchema.omit({ product_id: true })).max(12).optional(),
});

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
