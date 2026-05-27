import { requireRole } from "@/lib/api/auth";
import { getCurrentSellerVendor } from "@/lib/api/queries/seller";
import { AppError } from "@/lib/errors";
import { stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";
import { recordOperationalEvent } from "@/lib/production/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SettlementRow = Tables<"settlement_records"> & {
  order: Pick<Tables<"orders">, "order_number" | "payment_reference" | "status" | "payment_status" | "created_at"> | Pick<Tables<"orders">, "order_number" | "payment_reference" | "status" | "payment_status" | "created_at">[] | null;
  commission: Pick<Tables<"order_commission_calculations">, "rate_bps" | "fixed_fee_amount" | "explanation"> | Pick<Tables<"order_commission_calculations">, "rate_bps" | "fixed_fee_amount" | "explanation">[] | null;
};

type PayoutBatchRow = Tables<"seller_payout_batches"> & {
  items: Tables<"seller_payout_batch_items">[] | null;
};

type RefundRow = Tables<"refund_requests"> & {
  order: Pick<Tables<"orders">, "order_number" | "vendor_id" | "payment_reference"> | Pick<Tables<"orders">, "order_number" | "vendor_id" | "payment_reference">[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

export type SellerFinanceSnapshot = {
  vendor: Pick<Tables<"vendors">, "id" | "name"> | null;
  metrics: {
    grossSales: number;
    commission: number;
    pendingBalance: number;
    availableBalance: number;
    paidOut: number;
    refundAdjustments: number;
    failedPayouts: number;
  };
  settlements: Array<{
    id: string;
    orderNumber: string;
    grossAmount: number;
    commissionAmount: number;
    netAmount: number;
    availableAmount: number;
    refundAdjustmentAmount: number;
    currency: string;
    lifecycleState: Tables<"settlement_records">["lifecycle_state"];
    expectedPayoutAt: string;
    commissionExplanation: string;
    commissionRateBps: number;
    paymentReference: string | null;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    state: Tables<"seller_payout_batches">["state"];
    retryCount: number;
    scheduledFor: string;
    initiatedAt: string | null;
    completedAt: string | null;
    failureReason: string | null;
    itemCount: number;
  }>;
};

export type AdminFinanceSnapshot = {
  metrics: SellerFinanceSnapshot["metrics"] & {
    platformRevenue: number;
    openReconciliationCases: number;
    payoutProcessing: number;
    refundQueueAmount: number;
    settlementBacklog: number;
  };
  settlements: SellerFinanceSnapshot["settlements"];
  payouts: SellerFinanceSnapshot["payouts"];
  refunds: Array<{
    id: string;
    orderNumber: string;
    amount: number;
    currency: string;
    state: Tables<"refund_requests">["state"];
    reason: string;
    createdAt: string;
    completedAt: string | null;
    paymentReference: string | null;
  }>;
  reconciliationCases: Array<{
    id: string;
    type: Tables<"financial_reconciliation_cases">["case_type"];
    state: Tables<"financial_reconciliation_cases">["state"];
    severity: string;
    title: string;
    detail: string;
    recoveryAction: string;
    expectedAmount: number | null;
    observedAmount: number | null;
    createdAt: string;
  }>;
};

function mapSettlement(row: SettlementRow): SellerFinanceSnapshot["settlements"][number] {
  const order = first(row.order);
  const commission = first(row.commission);

  return {
    id: row.id,
    orderNumber: order?.order_number ?? row.order_id,
    grossAmount: money(row.gross_amount),
    commissionAmount: money(row.commission_amount),
    netAmount: money(row.net_amount),
    availableAmount: money(row.available_amount),
    refundAdjustmentAmount: money(row.refund_adjustment_amount),
    currency: row.currency,
    lifecycleState: row.lifecycle_state,
    expectedPayoutAt: row.expected_payout_at,
    commissionExplanation: commission?.explanation ?? "Commission calculation recorded on settlement.",
    commissionRateBps: commission?.rate_bps ?? 0,
    paymentReference: order?.payment_reference ?? null,
  };
}

function mapPayout(row: PayoutBatchRow): SellerFinanceSnapshot["payouts"][number] {
  return {
    id: row.id,
    amount: money(row.amount),
    currency: row.currency,
    state: row.state,
    retryCount: row.retry_count,
    scheduledFor: row.scheduled_for,
    initiatedAt: row.initiated_at,
    completedAt: row.completed_at,
    failureReason: row.failure_reason,
    itemCount: row.items?.length ?? 0,
  };
}

function metricsFrom(settlements: SellerFinanceSnapshot["settlements"], payouts: SellerFinanceSnapshot["payouts"]) {
  return {
    grossSales: sum(settlements, (item) => item.grossAmount),
    commission: sum(settlements, (item) => item.commissionAmount),
    pendingBalance: sum(settlements.filter((item) => !["PAYOUT_COMPLETED", "DISPUTED"].includes(item.lifecycleState)), (item) => item.netAmount),
    availableBalance: sum(settlements.filter((item) => ["PAYOUT_PENDING", "SETTLED"].includes(item.lifecycleState)), (item) => item.availableAmount),
    paidOut: sum(payouts.filter((item) => item.state === "COMPLETED"), (item) => item.amount),
    refundAdjustments: sum(settlements, (item) => item.refundAdjustmentAmount),
    failedPayouts: payouts.filter((item) => item.state === "FAILED").length,
  };
}

export async function getSellerFinanceSnapshot(): Promise<SellerFinanceSnapshot> {
  const vendor = await getCurrentSellerVendor();

  if (!vendor) {
    return {
      vendor: null,
      metrics: { grossSales: 0, commission: 0, pendingBalance: 0, availableBalance: 0, paidOut: 0, refundAdjustments: 0, failedPayouts: 0 },
      settlements: [],
      payouts: [],
    };
  }

  return withRequestCache(stableCacheKey(["seller-finance", vendor.id]), { ttlMs: 15_000, maxEntries: 80 }, async () => {
    const supabase = await createSupabaseServerClient();
    const [settlementsResult, payoutsResult] = await Promise.all([
      supabase
        .from("settlement_records")
        .select("*, order:orders(order_number,payment_reference,status,payment_status,created_at), commission:order_commission_calculations(rate_bps,fixed_fee_amount,explanation)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("seller_payout_batches")
        .select("*, items:seller_payout_batch_items(*)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (settlementsResult.error) throw settlementsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    const settlements = ((settlementsResult.data ?? []) as unknown as SettlementRow[]).map(mapSettlement);
    const payouts = ((payoutsResult.data ?? []) as unknown as PayoutBatchRow[]).map(mapPayout);

    return {
      vendor: { id: vendor.id, name: vendor.name },
      metrics: metricsFrom(settlements, payouts),
      settlements,
      payouts,
    };
  });
}

export async function getAdminFinanceSnapshot(): Promise<AdminFinanceSnapshot> {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  return withRequestCache(stableCacheKey(["admin-finance"]), { ttlMs: 15_000, maxEntries: 20 }, async () => {
    const supabase = await createSupabaseServerClient();
    const [settlementsResult, payoutsResult, refundsResult, casesResult] = await Promise.all([
      supabase
        .from("settlement_records")
        .select("*, order:orders(order_number,payment_reference,status,payment_status,created_at), commission:order_commission_calculations(rate_bps,fixed_fee_amount,explanation)")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("seller_payout_batches")
        .select("*, items:seller_payout_batch_items(*)")
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("refund_requests")
        .select("*, order:orders(order_number,vendor_id,payment_reference)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("financial_reconciliation_cases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    for (const result of [settlementsResult, payoutsResult, refundsResult, casesResult]) {
      if (result.error) throw result.error;
    }

    const settlements = ((settlementsResult.data ?? []) as unknown as SettlementRow[]).map(mapSettlement);
    const payouts = ((payoutsResult.data ?? []) as unknown as PayoutBatchRow[]).map(mapPayout);
    const refunds = ((refundsResult.data ?? []) as unknown as RefundRow[]).map((refund) => {
      const order = first(refund.order);
      return {
        id: refund.id,
        orderNumber: order?.order_number ?? refund.order_id,
        amount: money(refund.amount),
        currency: refund.currency,
        state: refund.state,
        reason: refund.reason,
        createdAt: refund.created_at,
        completedAt: refund.completed_at,
        paymentReference: order?.payment_reference ?? null,
      };
    });
    const reconciliationCases = ((casesResult.data ?? []) as Tables<"financial_reconciliation_cases">[]).map((item) => ({
      id: item.id,
      type: item.case_type,
      state: item.state,
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      recoveryAction: item.recovery_action,
      expectedAmount: item.expected_amount,
      observedAmount: item.observed_amount,
      createdAt: item.created_at,
    }));

    const base = metricsFrom(settlements, payouts);

    return {
      metrics: {
        ...base,
        platformRevenue: base.commission - base.refundAdjustments,
        openReconciliationCases: reconciliationCases.filter((item) => item.state === "OPEN" || item.state === "ESCALATED").length,
        payoutProcessing: payouts.filter((item) => item.state === "PROCESSING" || item.state === "RETRYING").length,
        refundQueueAmount: sum(refunds.filter((item) => !["REFUND_SUCCEEDED", "REFUND_REJECTED"].includes(item.state)), (item) => item.amount),
        settlementBacklog: settlements.filter((item) => ["PAYOUT_PENDING", "PAYOUT_PROCESSING"].includes(item.lifecycleState)).length,
      },
      settlements,
      payouts,
      refunds,
      reconciliationCases,
    };
  });
}

export async function createSellerPayoutBatchAction(vendorId: string, idempotencyKey: string, batchLimit = 100) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_seller_payout_batch", {
    target_vendor_id: vendorId,
    batch_idempotency_key: idempotencyKey,
    batch_limit: batchLimit,
  });

  if (error) {
    recordOperationalEvent("error", "finance.payout.batch_create_failed", { vendorId }, { domain: "payment", error });
    throw new AppError("DATABASE_ERROR", "Seller payout batch could not be created.", error);
  }

  return data;
}

export async function completeSellerPayoutBatchAction(batchId: string, providerPayoutId?: string | null, bankReference?: string | null) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("complete_seller_payout_batch", {
    target_batch_id: batchId,
    provider_payout_id: providerPayoutId ?? null,
    bank_reference: bankReference ?? null,
  });

  if (error) {
    recordOperationalEvent("error", "finance.payout.complete_failed", { batchId }, { domain: "payment", error });
    throw new AppError("DATABASE_ERROR", "Seller payout batch could not be completed.", error);
  }

  return data;
}

export async function retryFailedPayoutBatchAction(batchId: string) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("retry_failed_payout_batch", { target_batch_id: batchId });

  if (error) {
    recordOperationalEvent("error", "finance.payout.retry_failed", { batchId }, { domain: "payment", error });
    throw new AppError("DATABASE_ERROR", "Seller payout batch could not be retried.", error);
  }

  return data;
}
