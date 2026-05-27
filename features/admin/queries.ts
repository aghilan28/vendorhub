"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";
import { queryCachePolicy } from "@/lib/performance/cache-policy";
import type { AdminNotification, CategoryNode, GovernanceFlag, GovernanceMetric, ModerationCase, PlatformOrder, RefundCase, VendorApplication } from "./types";

type AdminSnapshot = {
  governanceMetrics: GovernanceMetric[];
  vendors: VendorApplication[];
  moderationCases: ModerationCase[];
  refunds: RefundCase[];
  platformOrders: PlatformOrder[];
  categories: CategoryNode[];
  flags: GovernanceFlag[];
  adminNotifications: AdminNotification[];
  analytics: {
    growth: number[];
    orders: number[];
    moderation: number[];
  };
};

async function fetchAdminSnapshot() {
  const envelope = await fetchJson<ApiEnvelope<AdminSnapshot>>("/api/admin/snapshot");
  return envelope.data;
}

function useAdminSnapshot<T>(queryKey: readonly unknown[], select: (snapshot: AdminSnapshot) => T) {
  return useQuery({
    queryKey,
    queryFn: fetchAdminSnapshot,
    select,
    staleTime: queryCachePolicy.dashboards.staleTime,
    gcTime: queryCachePolicy.dashboards.gcTime,
  });
}

export function useAdminDashboard() {
  return useAdminSnapshot(["admin", "dashboard"], (snapshot) => snapshot);
}

export function useVendors() {
  return useAdminSnapshot(["admin", "vendors"], (snapshot) => snapshot.vendors);
}

export function useModeration() {
  return useAdminSnapshot(["admin", "moderation"], (snapshot) => snapshot.moderationCases);
}

export function useRefunds() {
  return useAdminSnapshot(["admin", "refunds"], (snapshot) => snapshot.refunds);
}

export function useOrders() {
  return useAdminSnapshot(["admin", "orders"], (snapshot) => snapshot.platformOrders);
}

export function useCategories() {
  return useAdminSnapshot(["admin", "categories"], (snapshot) => snapshot.categories);
}

export function useAdminAnalytics() {
  return useAdminSnapshot(["admin", "analytics"], (snapshot) => snapshot.analytics);
}
