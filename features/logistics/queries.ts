"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";
import { seedDeliveries } from "./data";
import type { Delivery, DispatchQueue } from "./types";

const delay = async () => new Promise((resolve) => setTimeout(resolve, 45));

const dispatchQueue = {
  pending: seedDeliveries.filter((delivery) => delivery.status === "DELIVERY_PENDING" || delivery.status === "READY_FOR_DISPATCH"),
  active: seedDeliveries.filter((delivery) => ["DISPATCHED", "IN_TRANSIT", "ARRIVING"].includes(delivery.status)),
  delayed: seedDeliveries.filter((delivery) => delivery.etaConfidence === "low" && delivery.status !== "DELIVERED"),
  failed: seedDeliveries.filter((delivery) => delivery.status === "FAILED"),
};

export function useDeliveries() {
  return useQuery({
    queryKey: ["logistics", "deliveries"],
    initialData: seedDeliveries,
    queryFn: async () => {
      try {
        const response = await fetchJson<ApiEnvelope<Delivery[]>>("/api/logistics/deliveries");
        return response.data;
      } catch {
        await delay();
        return seedDeliveries;
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useDeliveryTracking(orderId?: string) {
  return useQuery({
    queryKey: ["logistics", "tracking", orderId],
    initialData: seedDeliveries.find((delivery) => delivery.orderId === orderId || delivery.orderCode === orderId),
    queryFn: async () => {
      if (!orderId) return undefined;
      try {
        const response = await fetchJson<ApiEnvelope<Delivery>>(`/api/logistics/deliveries/${orderId}`);
        return response.data;
      } catch {
        await delay();
        return seedDeliveries.find((delivery) => delivery.orderId === orderId || delivery.orderCode === orderId);
      }
    },
    refetchInterval: 20000,
    staleTime: 8000,
  });
}

export function useDispatchQueue() {
  return useQuery({
    queryKey: ["logistics", "dispatch-queue"],
    initialData: dispatchQueue,
    queryFn: async () => {
      try {
        const response = await fetchJson<ApiEnvelope<DispatchQueue>>("/api/logistics/dispatch");
        return response.data;
      } catch {
        await delay();
        return dispatchQueue;
      }
    },
    refetchInterval: 20000,
    staleTime: 8000,
  });
}
