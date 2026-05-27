import type { CartItem, MoneyBreakdown } from "@/types";
import { calculateIndiaTaxBreakdown } from "@/features/commerce-finance/gst";

export function calculateOrderPricing(items: CartItem[]): MoneyBreakdown {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const delivery = subtotal === 0 || subtotal >= 499 ? 0 : 39;
  const taxBreakdown = calculateIndiaTaxBreakdown(subtotal);
  const discount = subtotal >= 799 ? 50 : 0;

  return {
    subtotal,
    ...taxBreakdown,
    delivery,
    discount,
    total: Math.max(0, subtotal + taxBreakdown.tax + delivery - discount),
    currency: "INR",
  };
}

export function formatOrderCode(index: number) {
  return `KX-${String(1045 + index).padStart(4, "0")}`;
}
