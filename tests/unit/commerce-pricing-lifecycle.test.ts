import { describe, expect, it, vi } from "vitest";
import { calculateOrderPricing, formatOrderCode } from "@/features/transactions/pricing";
import { canTransitionOrder, describePaymentStatus, transitionOrder } from "@/features/transactions/lifecycle";
import { PaymentStatus, OrderStatus } from "@/types";
import { createCartItem, createOrder } from "../utils/fixtures";

describe("commerce pricing reliability", () => {
  it("keeps totals deterministic across tax, delivery, and discount thresholds", () => {
    const lowValue = calculateOrderPricing([createCartItem({ quantity: 2 })]);
    expect(lowValue.subtotal).toBe(160);
    expect(lowValue.tax).toBe(8);
    expect(lowValue.delivery).toBe(39);
    expect(lowValue.discount).toBe(0);
    expect(lowValue.total).toBe(207);

    const highValue = calculateOrderPricing([createCartItem({ quantity: 10 })]);
    expect(highValue.subtotal).toBe(800);
    expect(highValue.delivery).toBe(0);
    expect(highValue.discount).toBe(50);
    expect(highValue.total).toBe(790);
  });

  it("never produces negative totals when discounts exceed an empty cart", () => {
    expect(calculateOrderPricing([]).total).toBe(0);
  });

  it("formats stable order codes for regression-safe references", () => {
    expect(formatOrderCode(0)).toBe("KX-1045");
    expect(formatOrderCode(12)).toBe("KX-1057");
  });
});

describe("order lifecycle reliability", () => {
  it("allows only valid commerce state transitions", () => {
    expect(canTransitionOrder(OrderStatus.Pending, OrderStatus.Confirmed)).toBe(true);
    expect(canTransitionOrder(OrderStatus.Pending, OrderStatus.Delivered)).toBe(false);
    expect(canTransitionOrder(OrderStatus.Delivered, OrderStatus.Cancelled)).toBe(false);
  });

  it("records history, audit, and buyer notification on critical transitions", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const order = createOrder();
    const result = transitionOrder(order, OrderStatus.Confirmed, "seller", "Seller accepted the order.");

    expect(result.order.status).toBe(OrderStatus.Confirmed);
    expect(result.order.history).toHaveLength(1);
    expect(result.order.auditTrail[0]).toMatchObject({
      action: "order_status_changed",
      metadata: { from: OrderStatus.Pending, to: OrderStatus.Confirmed, note: "Seller accepted the order." },
    });
    expect(result.notification?.event).toBe("order_confirmed");
  });

  it("rejects invalid lifecycle jumps before they corrupt order truth", () => {
    expect(() => transitionOrder(createOrder(), OrderStatus.Delivered, "system", "Skip ahead")).toThrow("Invalid transition");
  });

  it("keeps payment status copy deterministic for support and diagnostics", () => {
    expect(describePaymentStatus(PaymentStatus.Succeeded)).toBe("Payment captured");
    expect(describePaymentStatus(PaymentStatus.IntentCreated)).toBe("Razorpay order created");
    expect(describePaymentStatus(PaymentStatus.NotStarted)).toBe("Payment not started");
  });
});
