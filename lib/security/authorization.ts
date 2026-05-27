import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants/marketplace";
import type { Tables } from "@/types/database";

export type SecurityActor = {
  id: string;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export type RequestSecurityContext = {
  actor: SecurityActor | null;
  ip: string;
  userAgent: string;
  requestId: string;
};

export function getRequestIp(request: Request | NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function getRequestId(request: Request | NextRequest) {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export async function getSecurityContext(request: Request | NextRequest): Promise<RequestSecurityContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new AppError("AUTH_REQUIRED", "Session validation failed.", { reason: error.message });

  let actor: SecurityActor | null = null;
  if (user) {
    const { data, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).is("deleted_at", null);
    if (rolesError) throw new AppError("DATABASE_ERROR", "Unable to validate role scope.", rolesError);
    const roles = (data ?? []).map((row) => row.role as AppRole);
    actor = {
      id: user.id,
      roles,
      isAdmin: roles.includes("ADMIN") || roles.includes("SUPER_ADMIN"),
      isSuperAdmin: roles.includes("SUPER_ADMIN"),
    };
  }

  return {
    actor,
    ip: getRequestIp(request),
    userAgent: request.headers.get("user-agent") ?? "unknown",
    requestId: getRequestId(request),
  };
}

export function requireAuthenticated(context: RequestSecurityContext) {
  if (!context.actor) throw new AppError("AUTH_REQUIRED", "Authentication is required.");
  return context.actor;
}

export function requireAnyRole(context: RequestSecurityContext, roles: AppRole[]) {
  const actor = requireAuthenticated(context);
  if (!actor.roles.some((role) => roles.includes(role))) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return actor;
}

export async function requireVendorScope(context: RequestSecurityContext, vendorId: string) {
  const actor = requireAuthenticated(context);
  if (actor.isAdmin) return actor;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_members")
    .select("id")
    .eq("user_id", actor.id)
    .eq("vendor_id", vendorId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError("DATABASE_ERROR", "Unable to validate seller scope.", error);
  if (!data) throw new AppError("FORBIDDEN", "Seller scope does not include this vendor.");
  return actor;
}

export function canReadOrder(actor: SecurityActor, order: Pick<Tables<"orders">, "buyer_id" | "vendor_id">, vendorMember = false) {
  return actor.isAdmin || order.buyer_id === actor.id || vendorMember;
}

export function assertSafeMethod(request: Request | NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.includes("application/json") && !contentType.includes("text/plain")) {
    throw new AppError("VALIDATION_ERROR", "Unsupported request content type.");
  }
}
