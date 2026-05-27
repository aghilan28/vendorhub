import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants/marketplace";
import { AppError } from "@/lib/errors";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new AppError("AUTH_REQUIRED", error.message, error);
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError("AUTH_REQUIRED", "You must be signed in to access this resource.");
  }

  return user;
}

export async function getCurrentUserRoles(): Promise<AppRole[]> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).is("deleted_at", null);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to load user roles.", error);
  }

  return data.map((item) => item.role);
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireUser();
  const roles = await getCurrentUserRoles();

  if (!roles.some((role) => allowedRoles.includes(role))) {
    throw new AppError("FORBIDDEN", "You do not have permission to access this resource.");
  }

  return { user, roles };
}

export async function redirectByRole() {
  const roles = await getCurrentUserRoles();

  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) {
    redirect("/admin/dashboard");
  }

  if (roles.includes("SELLER")) {
    redirect("/seller/dashboard");
  }

  redirect("/home");
}
