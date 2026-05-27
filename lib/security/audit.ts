import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordOperationalEvent } from "@/lib/production/observability";
import type { Json } from "@/types/database";

type SecurityAuditInput = {
  actorId?: string | null;
  vendorId?: string | null;
  action: string;
  entityTable: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

const sensitiveKeyPattern = /(password|secret|token|signature|authorization|cookie|credential|kyc|document|pan|aadhaar|card|cvv|otp|key|phone|address)/i;

export async function recordSecurityAudit(input: SecurityAuditInput) {
  const metadata = redactSecurityMetadata(input.metadata ?? {});

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      vendor_id: input.vendorId ?? null,
      action: input.action,
      entity_table: input.entityTable,
      entity_id: input.entityId ?? null,
      old_values: null,
      new_values: null,
      ip_address: null,
      metadata: metadata as Json,
    });
  } catch (error) {
    recordOperationalEvent("warn", "security.audit.write_failed", { action: input.action }, { domain: "security", error });
  }
}

export function redactSecurityMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (sensitiveKeyPattern.test(key)) return [key, "[redacted]"];
      if (item && typeof item === "object" && !Array.isArray(item)) return [key, redactSecurityMetadata(item as Record<string, unknown>)];
      return [key, item];
    }),
  );
}
