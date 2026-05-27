"use client";

import { useQuery } from "@tanstack/react-query";
import { useCheckoutStore } from "@/store/checkout-store";

const delay = async () => new Promise((resolve) => setTimeout(resolve, 80));

export function useTransactionOrders() {
  const orders = useCheckoutStore((state) => state.orders);
  return useQuery({
    queryKey: ["transactions", "orders", orders.length, orders.map((order) => `${order.id}:${order.status}:${order.payment.status}`).join("|")],
    queryFn: async () => (await delay(), orders),
    initialData: orders,
  });
}

export function useTransactionOrder(orderId: string) {
  const orders = useCheckoutStore((state) => state.orders);
  return useQuery({
    queryKey: ["transactions", "orders", orderId, orders.find((order) => order.id === orderId)?.updatedAt],
    queryFn: async () => (await delay(), orders.find((order) => order.id === orderId)),
    initialData: orders.find((order) => order.id === orderId),
  });
}

export function useTransactionInventory() {
  const inventory = useCheckoutStore((state) => state.inventory);
  return useQuery({
    queryKey: ["transactions", "inventory", inventory.map((item) => `${item.productId}:${item.available}:${item.status}`).join("|")],
    queryFn: async () => (await delay(), inventory),
    initialData: inventory,
  });
}
