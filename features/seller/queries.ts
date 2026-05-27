"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";
import { queryCachePolicy } from "@/lib/performance/cache-policy";
import type { MerchantIntelligenceSnapshot } from "@/features/merchant-intelligence";
import type { InventoryItem, SellerMetric, SellerNotification, SellerOrder, SellerProduct } from "./types";

type SellerSnapshot = {
  metrics: SellerMetric[];
  products: SellerProduct[];
  inventory: InventoryItem[];
  orders: SellerOrder[];
  notifications: SellerNotification[];
  analytics: {
    sales: number[];
    orders: number[];
    category: Array<{ label: string; value: string }>;
  };
  intelligence?: MerchantIntelligenceSnapshot;
};

async function fetchSellerSnapshot() {
  const envelope = await fetchJson<ApiEnvelope<SellerSnapshot>>("/api/seller/snapshot");
  return envelope.data;
}

function useSellerSnapshot<T>(queryKey: readonly unknown[], select: (snapshot: SellerSnapshot) => T) {
  return useQuery({
    queryKey,
    queryFn: fetchSellerSnapshot,
    select,
    staleTime: queryCachePolicy.dashboards.staleTime,
    gcTime: queryCachePolicy.dashboards.gcTime,
  });
}

export function useSellerDashboard() {
  return useSellerSnapshot(["seller", "dashboard"], (snapshot) => snapshot);
}

export function useSellerProducts() {
  return useSellerSnapshot(["seller", "products"], (snapshot) => snapshot.products);
}

export function useSellerInventory() {
  return useSellerSnapshot(["seller", "inventory"], (snapshot) => snapshot.inventory);
}

export function useSellerOrders() {
  return useSellerSnapshot(["seller", "orders"], (snapshot) => snapshot.orders);
}

export function useSellerAnalytics() {
  return useSellerSnapshot(["seller", "analytics"], (snapshot) => snapshot.analytics);
}

export function useSellerIntelligence() {
  return useSellerSnapshot(["seller", "intelligence"], (snapshot) => snapshot.intelligence);
}
