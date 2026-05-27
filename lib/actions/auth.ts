"use server";

import { redirect } from "next/navigation";
import { SignInSchema, SignUpSchema } from "@/lib/validations/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export async function signInAction(input: unknown) {
  const parsed = SignInSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid sign-in payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    throw new AppError("AUTH_REQUIRED", error.message, error);
  }

  redirect("/home");
}

export async function signUpAction(input: unknown) {
  const parsed = SignUpSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid sign-up payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { email, password, name } = parsed.data;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        default_role: "BUYER",
      },
    },
  });

  if (error) {
    throw new AppError("AUTH_REQUIRED", error.message, error);
  }

  redirect("/home");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
