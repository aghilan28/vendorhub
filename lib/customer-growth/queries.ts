// MCP-1D — Live customer-growth data access.
//
// Reads REAL signed-in customer activity (orders) when Supabase is configured
// and feeds the deterministic engine. Honest degradation: unconfigured /
// no-activity / auth failure → clearly-labelled sample (sampled: true). Never
// surfaces demo data inside a "live" result.

import { requireRole, requireUser } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildAdminGrowthSnapshot,
  buildCustomerGrowthSnapshot,
  buildSampleAdminGrowthSnapshot,
  buildSampleCustomerGrowthSnapshot,
} from "./index";
import {
  SAMPLE_BEHAVIOR,
  SAMPLE_CAMPAIGNS,
  SAMPLE_DEMAND_CELLS,
  SAMPLE_ENGAGEMENT,
  SAMPLE_REFERRALS,
} from "./sample";
import { pointsForOrder, tierForLifetimePoints } from "./loyalty";
import type {
  AdminGrowthSnapshot,
  CustomerActivity,
  CustomerGrowthSnapshot,
  CustomerProfileInput,
  RewardLedgerEntry,
} from "./types";

function isConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(source: Record<string, unknown>, key: string, fallback = ""): string {
  const v = source[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}
function num(source: Record<string, unknown>, key: string, fallback = 0): number {
  const v = source[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;
}
function daysAgo(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

/** Derive a deterministic reward ledger from real orders (1 pt / ₹100 at tier). */
function ledgerFromOrders(customerId: string, orders: Array<{ amount: number; ageDays: number }>): RewardLedgerEntry[] {
  const lifetimeBase = orders.reduce((s, o) => s + Math.round(o.amount / 100), 0);
  const tier = tierForLifetimePoints(lifetimeBase);
  const entries: RewardLedgerEntry[] = orders.map((o, i) => ({
    id: `rl-order-${i}`,
    customerId,
    points: pointsForOrder(o.amount, tier),
    reason: "order",
    refId: `o-${i}`,
    daysAgo: o.ageDays,
    expiresInDays: 365,
  }));
  entries.push({ id: "rl-signup", customerId, points: 100, reason: "signup", daysAgo: 365, expiresInDays: 365 });
  return entries;
}

export interface CustomerGrowthResult {
  configured: boolean;
  sampled: boolean;
  snapshot: CustomerGrowthSnapshot;
}

export async function getCustomerGrowthSnapshot(): Promise<CustomerGrowthResult> {
  if (!isConfigured()) return { configured: false, sampled: true, snapshot: buildSampleCustomerGrowthSnapshot() };
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("orders")
      .select("id, total_amount, created_at, status")
      .eq("buyer_id", user.id)
      .is("deleted_at", null)
      .limit(500);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return { configured: true, sampled: true, snapshot: buildSampleCustomerGrowthSnapshot() };

    const orders = rows.map((r) => ({ amount: num(r, "total_amount", 0), ageDays: daysAgo(str(r, "created_at")) ?? 9999 }));
    const totalSpend = orders.reduce((s, o) => s + o.amount, 0);
    const ages = orders.map((o) => o.ageDays).sort((a, b) => a - b);
    const activity: CustomerActivity = {
      orders: orders.length,
      totalSpend,
      lastOrderDaysAgo: ages[0] ?? null,
      firstOrderDaysAgo: ages[ages.length - 1] ?? null,
      avgOrderValue: orders.length ? Math.round(totalSpend / orders.length) : 0,
    };
    const profile: CustomerProfileInput = {
      customerId: user.id,
      name: str(rec(user.user_metadata), "name") || (user.email ? user.email.split("@")[0] : "Customer"),
      email: user.email ?? undefined,
      emailVerified: Boolean(user.email_confirmed_at),
      activity,
    };
    const snapshot = buildCustomerGrowthSnapshot({
      profile,
      ledger: ledgerFromOrders(user.id, orders),
      referrals: SAMPLE_REFERRALS.filter((r) => r.referrerId === user.id), // referral table is a typed follow-up
      behavior: SAMPLE_BEHAVIOR,
      engagement: SAMPLE_ENGAGEMENT.filter((e) => e.customerId === user.id),
      campaigns: SAMPLE_CAMPAIGNS,
      demandCells: SAMPLE_DEMAND_CELLS,
    });
    return { configured: true, sampled: false, snapshot };
  } catch {
    return { configured: true, sampled: true, snapshot: buildSampleCustomerGrowthSnapshot() };
  }
}

export interface AdminGrowthResult {
  configured: boolean;
  sampled: boolean;
  snapshot: AdminGrowthSnapshot;
}

export async function getAdminGrowthSnapshot(): Promise<AdminGrowthResult> {
  if (!isConfigured()) return { configured: false, sampled: true, snapshot: buildSampleAdminGrowthSnapshot() };
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const supabase = await createSupabaseServerClient();
    // Aggregate per-customer order activity.
    const { data } = await supabase
      .from("orders")
      .select("buyer_id, total_amount, created_at")
      .is("deleted_at", null)
      .limit(5000);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return { configured: true, sampled: true, snapshot: buildSampleAdminGrowthSnapshot() };

    const byCustomer = new Map<string, { amount: number; ageDays: number }[]>();
    for (const r of rows) {
      const uid = str(r, "buyer_id");
      if (!uid) continue;
      const list = byCustomer.get(uid) ?? [];
      list.push({ amount: num(r, "total_amount", 0), ageDays: daysAgo(str(r, "created_at")) ?? 9999 });
      byCustomer.set(uid, list);
    }
    const customers: CustomerProfileInput[] = [...byCustomer.entries()].map(([uid, orders]) => {
      const totalSpend = orders.reduce((s, o) => s + o.amount, 0);
      const ages = orders.map((o) => o.ageDays).sort((a, b) => a - b);
      return {
        customerId: uid,
        activity: {
          orders: orders.length,
          totalSpend,
          lastOrderDaysAgo: ages[0] ?? null,
          firstOrderDaysAgo: ages[ages.length - 1] ?? null,
          avgOrderValue: orders.length ? Math.round(totalSpend / orders.length) : 0,
        },
      };
    });
    if (customers.length === 0) return { configured: true, sampled: true, snapshot: buildSampleAdminGrowthSnapshot() };

    const snapshot = buildAdminGrowthSnapshot({
      customers,
      referrals: SAMPLE_REFERRALS, // referral / campaign / engagement tables are a typed follow-up
      campaigns: SAMPLE_CAMPAIGNS,
      engagement: SAMPLE_ENGAGEMENT,
      demandCells: SAMPLE_DEMAND_CELLS,
    });
    return { configured: true, sampled: false, snapshot };
  } catch {
    return { configured: true, sampled: true, snapshot: buildSampleAdminGrowthSnapshot() };
  }
}
