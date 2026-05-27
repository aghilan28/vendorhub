import { AppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UnsafeRpcClient = ReturnType<typeof createSupabaseAdminClient> & {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};

export async function runDeliveryReconciliationSystem(batchSize = 100) {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc("run_delivery_reconciliation", { batch_size: batchSize });

  if (error) {
    recordOperationalEvent("error", "delivery.reconciliation.failed", { batchSize }, { domain: "delivery", error });
    throw new AppError("DATABASE_ERROR", "Delivery reconciliation failed.", error);
  }

  recordOperationalEvent("info", "delivery.reconciliation.completed", { batchSize, result: "[object]" }, { domain: "delivery" });
  return data;
}

export async function runDeliverySlaDetectionSystem() {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc("run_delivery_sla_detection");

  if (error) {
    recordOperationalEvent("error", "delivery.sla_detection.failed", {}, { domain: "delivery", error });
    throw new AppError("DATABASE_ERROR", "Delivery SLA detection failed.", error);
  }

  recordOperationalEvent("info", "delivery.sla_detection.completed", { result: "[object]" }, { domain: "delivery" });
  return data;
}

export async function refreshDeliveryEtaSystem(deliveryId: string, etaMinutes: number, confidence = "MEDIUM", reason = "ETA refreshed by async logistics recovery.") {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc("refresh_delivery_eta", {
    target_delivery_id: deliveryId,
    eta_minutes_new: etaMinutes,
    eta_confidence_new: confidence,
    eta_reason: reason,
  });

  if (error) {
    recordOperationalEvent("error", "delivery.eta_refresh.failed", { deliveryId }, { domain: "delivery", error });
    throw new AppError("DATABASE_ERROR", "Delivery ETA refresh failed.", error);
  }

  return data;
}
