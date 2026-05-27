import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const SlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const MoneySchema = z.number().nonnegative().multipleOf(0.01);

export const AddressSnapshotSchema = z.object({
  recipient_name: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(4),
  line2: z.string().optional(),
  locality: z.string().min(2),
  city: z.string().min(2),
  region: z.string().min(2),
  postal_code: z.string().min(4),
  country_code: z.string().length(2).default("IN"),
});
