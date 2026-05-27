import { z } from "zod";

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SignUpSchema = SignInSchema.extend({
  name: z.string().min(2),
});

export const SellerRegistrationSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  category: z.string().min(2),
});

export const ProfileSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  avatar_url: z.string().url().optional(),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SellerRegistrationInput = z.infer<typeof SellerRegistrationSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;
