import type { GstInvoice, Order, PaymentTransaction, SettlementBreakdown } from "@/types";
import type { FinanceDashboardSummary, SettlementGenerationInput } from "./types";

const COMMISSION_RATE = 0.08;

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function generateSettlement({ order }: SettlementGenerationInput): SettlementBreakdown {
  const seller = order.items[0]?.product.vendor;
  const grossAmount = order.total;
  const commission = Math.round(grossAmount * COMMISSION_RATE);
  const isCod = order.payment.method === "cod";
  const deliveredOrCaptured = order.payment.status === "SUCCEEDED" || order.payment.status === "COD_CONFIRMED";

  return {
    id: `set-${order.id}`,
    orderId: order.id,
    sellerId: seller?.id ?? "mixed-seller",
    sellerName: seller?.name ?? "Mixed sellers",
    paymentMode: order.payment.method,
    grossAmount,
    commissionRate: COMMISSION_RATE,
    commission,
    taxWithheldPlaceholder: 0,
    codCollectionPending: isCod ? grossAmount : 0,
    sellerEarnings: grossAmount - commission,
    status: deliveredOrCaptured ? "eligible" : isCod ? "pending" : "processing",
    expectedPayoutDate: addDays(order.createdAt, isCod ? 5 : 2),
    reference: `VHSET${order.code.replace(/\D/g, "")}`,
  };
}

export function summarizeFinance(orders: Order[]): FinanceDashboardSummary {
  const settlements = orders.map((order) => order.settlement ?? generateSettlement({ order }));
  const invoices = orders.map((order) => order.invoice).filter(Boolean) as GstInvoice[];
  const grossSales = settlements.reduce((sum, item) => sum + item.grossAmount, 0);
  const sellerEarnings = settlements.reduce((sum, item) => sum + item.sellerEarnings, 0);
  const pendingPayouts = settlements.filter((item) => item.status !== "settled").reduce((sum, item) => sum + item.sellerEarnings, 0);
  const settledPayouts = settlements.filter((item) => item.status === "settled").reduce((sum, item) => sum + item.sellerEarnings, 0);
  const codExposure = settlements.reduce((sum, item) => sum + item.codCollectionPending, 0);
  const commission = settlements.reduce((sum, item) => sum + item.commission, 0);
  const methods: PaymentTransaction["method"][] = ["upi", "cod", "card", "netbanking", "wallet"];
  const paymentMix = methods
    .map((method) => {
      const methodOrders = orders.filter((order) => order.payment.method === method);
      return {
        label: method.toUpperCase(),
        value: methodOrders.length,
        amount: methodOrders.reduce((sum, order) => sum + order.total, 0),
      };
    })
    .filter((item) => item.value > 0);

  return { grossSales, sellerEarnings, pendingPayouts, settledPayouts, codExposure, commission, settlements, invoices, paymentMix };
}
