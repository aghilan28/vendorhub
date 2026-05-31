import { requireRole } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface TrustGovernanceCounts {
  configured: boolean;
  reviews: number;
  flaggedReviews: number;
  openDisputes: number;
  openRefunds: number;
  trustedSellers: number;
}

const EMPTY: TrustGovernanceCounts = {
  configured: false,
  reviews: 0,
  flaggedReviews: 0,
  openDisputes: 0,
  openRefunds: 0,
  trustedSellers: 0,
};

/**
 * Real, admin-gated trust governance counts from existing tables (reviews,
 * marketplace_disputes, refund_requests, trust_scores). Honest empty snapshot
 * when Supabase is not configured.
 */
export async function getTrustGovernanceCounts(): Promise<TrustGovernanceCounts> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return EMPTY;
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const head = { count: "exact" as const, head: true };

  const [reviews, flagged, disputes, refunds, trusted] = await Promise.all([
    supabase.from("reviews").select("id", head),
    supabase.from("reviews").select("id", head).neq("moderation_status", "VISIBLE"),
    supabase.from("marketplace_disputes").select("id", head),
    supabase.from("refund_requests").select("id", head),
    supabase.from("trust_scores").select("id", head).gte("score", 75),
  ]);

  return {
    configured: true,
    reviews: reviews.count ?? 0,
    flaggedReviews: flagged.count ?? 0,
    openDisputes: disputes.count ?? 0,
    openRefunds: refunds.count ?? 0,
    trustedSellers: trusted.count ?? 0,
  };
}
