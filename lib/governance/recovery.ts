import { AppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UnsafeRpcClient = ReturnType<typeof createSupabaseAdminClient> & {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};

export async function runGovernanceFraudDetectionSystem(batchSize = 100) {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc("run_governance_detection", { batch_size: batchSize });

  if (error) {
    recordOperationalEvent("error", "governance.fraud_detection.failed", { batchSize }, { domain: "admin", error });
    throw new AppError("DATABASE_ERROR", "Governance fraud detection failed.", error);
  }

  recordOperationalEvent("info", "governance.fraud_detection.completed", { batchSize, result: "[object]" }, { domain: "admin" });
  return data;
}

export async function runGovernanceModerationRecoverySystem(batchSize = 100) {
  const supabase = createSupabaseAdminClient() as UnsafeRpcClient;
  const { data, error } = await supabase.rpc("run_governance_moderation_recovery", { batch_size: batchSize });

  if (error) {
    recordOperationalEvent("error", "governance.moderation_recovery.failed", { batchSize }, { domain: "admin", error });
    throw new AppError("DATABASE_ERROR", "Governance moderation recovery failed.", error);
  }

  recordOperationalEvent("info", "governance.moderation_recovery.completed", { batchSize, result: "[object]" }, { domain: "admin" });
  return data;
}
