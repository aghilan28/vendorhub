"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VendorOnboardingSchema } from "@/lib/validations/vendors";

export async function startVendorOnboardingAction(input: unknown) {
  const parsed = VendorOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid vendor onboarding payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendors").insert(parsed.data);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to start vendor onboarding.", error);
  }

  redirect("/seller/dashboard");
}
