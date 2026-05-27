import { z } from "zod";
import { NOTIFICATION_CHANNELS, VENDOR_STATUSES } from "@/lib/constants/marketplace";
import { MoneySchema, SlugSchema, UuidSchema } from "./common";

export const VendorOnboardingSchema = z.object({
  owner_id: UuidSchema,
  name: z.string().min(2).max(140),
  slug: SlugSchema,
  description: z.string().max(2000).optional(),
  status: z.enum(VENDOR_STATUSES).default("PENDING_VERIFICATION"),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  service_radius_km: z.number().positive().max(50).default(5),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const VendorSettingsSchema = z.object({
  vendor_id: UuidSchema,
  accepts_orders: z.boolean().default(true),
  minimum_order_amount: MoneySchema.default(0),
  average_prep_minutes: z.number().int().min(1).max(240).default(30),
  operating_hours: z.record(z.string(), z.unknown()).default({}),
  notification_channels: z.array(z.enum(NOTIFICATION_CHANNELS)).default(["IN_APP"]),
});

export const VendorVerificationSchema = z.object({
  vendor_id: UuidSchema,
  legal_name: z.string().min(2),
  tax_id: z.string().min(4),
  document_urls: z.array(z.string().url()).default([]),
});

export type VendorOnboardingInput = z.infer<typeof VendorOnboardingSchema>;
