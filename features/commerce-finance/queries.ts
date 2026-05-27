"use client";

import { useQuery } from "@tanstack/react-query";
import { useCheckoutStore } from "@/store/checkout-store";
import { summarizeFinance } from "./payouts";

const delay = async () => new Promise((resolve) => setTimeout(resolve, 90));

export function useInvoices() {
  const orders = useCheckoutStore((state) => state.orders);
  return useQuery({
    queryKey: ["commerce-finance", "invoices", orders.map((order) => `${order.id}:${order.invoiceState}`).join("|")],
    queryFn: async () => (await delay(), orders.map((order) => order.invoice).filter(Boolean)),
    initialData: orders.map((order) => order.invoice).filter(Boolean),
  });
}

export function usePayoutSummary() {
  const orders = useCheckoutStore((state) => state.orders);
  return useQuery({
    queryKey: ["commerce-finance", "payouts", orders.map((order) => `${order.id}:${order.payment.status}:${order.total}`).join("|")],
    queryFn: async () => (await delay(), summarizeFinance(orders)),
    initialData: summarizeFinance(orders),
  });
}

export function useRefundQueue() {
  const orders = useCheckoutStore((state) => state.orders);
  return useQuery({
    queryKey: ["commerce-finance", "refunds", orders.map((order) => `${order.id}:${order.refund?.status ?? "none"}`).join("|")],
    queryFn: async () => (await delay(), orders.filter((order) => order.refund)),
    initialData: orders.filter((order) => order.refund),
  });
}
