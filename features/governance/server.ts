import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";
import { recordOperationalEvent } from "@/lib/production/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type GovernanceCaseRow = Tables<"governance_cases"> & {
  vendor: Pick<Tables<"vendors">, "name" | "status"> | Pick<Tables<"vendors">, "name" | "status">[] | null;
};

type RiskSignalRow = Tables<"governance_risk_signals"> & {
  vendor: Pick<Tables<"vendors">, "name"> | Pick<Tables<"vendors">, "name">[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function getAdminGovernanceSnapshot() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  return withRequestCache(stableCacheKey(["admin-governance-phase-29"]), { ttlMs: 15_000, maxEntries: 20 }, async () => {
    const supabase = await createSupabaseServerClient();
    const [casesResult, signalsResult, disputesResult, enforcementResult, trustResult] = await Promise.all([
      supabase.from("governance_cases").select("*, vendor:vendors(name,status)").order("created_at", { ascending: false }).limit(100),
      supabase.from("governance_risk_signals").select("*, vendor:vendors(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("marketplace_disputes").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("governance_enforcement_actions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("trust_scores").select("*").order("updated_at", { ascending: false }).limit(100),
    ]);

    for (const result of [casesResult, signalsResult, disputesResult, enforcementResult, trustResult]) {
      if (result.error) throw result.error;
    }

    const cases = ((casesResult.data ?? []) as unknown as GovernanceCaseRow[]).map((item) => ({
      id: item.id,
      type: item.case_type,
      state: item.state,
      severity: item.severity,
      seller: first(item.vendor)?.name ?? "Marketplace",
      sellerStatus: first(item.vendor)?.status ?? null,
      title: item.title,
      summary: item.summary,
      explanation: item.explanation,
      recommendedAction: item.recommended_action,
      createdAt: item.created_at,
    }));
    const signals = ((signalsResult.data ?? []) as unknown as RiskSignalRow[]).map((item) => ({
      id: item.id,
      type: item.signal_type,
      severity: item.severity,
      score: item.score,
      seller: first(item.vendor)?.name ?? "Marketplace",
      explanation: item.explanation,
      createdAt: item.created_at,
    }));
    const disputes = ((disputesResult.data ?? []) as Tables<"marketplace_disputes">[]).map((item) => ({
      id: item.id,
      type: item.dispute_type,
      state: item.state,
      title: item.title,
      description: item.description,
      locale: item.locale,
      createdAt: item.created_at,
    }));
    const enforcement = ((enforcementResult.data ?? []) as Tables<"governance_enforcement_actions">[]).map((item) => ({
      id: item.id,
      type: item.enforcement_type,
      state: item.state,
      severity: item.severity,
      reason: item.reason,
      reversible: item.reversible,
      createdAt: item.created_at,
    }));
    const trustScores = (trustResult.data ?? []) as Tables<"trust_scores">[];

    return {
      metrics: {
        openCases: cases.filter((item) => !["RESOLVED", "DISMISSED"].includes(item.state)).length,
        criticalSignals: signals.filter((item) => item.severity === "critical").length,
        activeDisputes: disputes.filter((item) => !item.state.startsWith("RESOLVED") && item.state !== "DISMISSED").length,
        activeEnforcement: enforcement.filter((item) => item.state === "ACTIVE").length,
        restrictedSellers: trustScores.filter((item) => item.trust_level === "restricted").length,
      },
      cases,
      signals,
      disputes,
      enforcement,
    };
  });
}

export async function runGovernanceDetectionAction(batchSize = 100) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("run_governance_detection", { batch_size: batchSize });

  if (error) {
    recordOperationalEvent("error", "governance.detection.failed", { batchSize }, { domain: "admin", error });
    throw new AppError("DATABASE_ERROR", "Governance detection failed.", error);
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin/dashboard");
  return data;
}

export async function applyGovernanceEnforcementAction(input: {
  vendorId: string;
  caseId?: string | null;
  type: Tables<"governance_enforcement_actions">["enforcement_type"];
  reason: string;
  severity?: string;
  expiresAt?: string | null;
}) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("apply_governance_enforcement", {
    target_vendor_id: input.vendorId,
    target_case_id: input.caseId ?? null,
    target_enforcement_type: input.type,
    enforcement_reason: input.reason,
    enforcement_severity: input.severity ?? "medium",
    expires_at: input.expiresAt ?? null,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Governance enforcement could not be applied.", error);
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/seller/dashboard");
  return data;
}

export async function reverseGovernanceEnforcementAction(actionId: string, reason: string) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reverse_governance_enforcement", { target_action_id: actionId, reason });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Governance enforcement could not be reversed.", error);
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/seller/dashboard");
  return data;
}
