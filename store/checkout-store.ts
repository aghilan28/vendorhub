import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PaymentStatus, OrderStatus } from "@/types";
import type { CartItem, CheckoutAddress, Order } from "@/types";
import { checkCodEligibility } from "@/features/commerce-finance/cod";
import { generateGstInvoice } from "@/features/commerce-finance/gst";
import { generateSettlement } from "@/features/commerce-finance/payouts";
import { createRazorpayCommerceIntent, processCommercePayment } from "@/features/commerce-finance/razorpay";
import { calculateOrderPricing, formatOrderCode } from "@/features/transactions/pricing";
import { savedAddresses, seedOrders, createInitialInventory } from "@/features/transactions/data";
import { transitionOrder } from "@/features/transactions/lifecycle";
import { createLocalRealtimeEvent, publishMarketplaceRealtimeEvent } from "@/lib/realtime/event-bus";
import type { AtomicCheckoutProgress, CheckoutInput, InventoryRecord, TransactionError } from "@/features/transactions/types";
import type { AtomicCheckoutResult } from "@/lib/transactions/atomic-checkout";

interface CheckoutState {
  step: "address" | "review" | "payment" | "confirmation";
  selectedAddressId: string;
  deliverySlot: string;
  paymentMethod: "upi" | "cod" | "card" | "netbanking" | "wallet";
  upiApp: "gpay" | "phonepe" | "paytm" | "bhim" | "generic";
  isProcessing: boolean;
  paymentMode: "success" | "failure" | "pending";
  lastError?: TransactionError;
  lastOrderId?: string;
  atomicProgress: AtomicCheckoutProgress;
  addresses: CheckoutAddress[];
  inventory: InventoryRecord[];
  orders: Order[];
  setStep: (step: CheckoutState["step"]) => void;
  setSelectedAddress: (addressId: string) => void;
  setDeliverySlot: (slot: string) => void;
  setPaymentMethod: (method: CheckoutState["paymentMethod"]) => void;
  setUpiApp: (upiApp: CheckoutState["upiApp"]) => void;
  setPaymentMode: (mode: CheckoutState["paymentMode"]) => void;
  validateCart: (items: CartItem[]) => TransactionError | undefined;
  beginAtomicCheckout: (idempotencyKey: string) => void;
  confirmAtomicCheckout: (result: AtomicCheckoutResult) => void;
  failAtomicCheckout: (message: string) => void;
  placeOrder: (items: CartItem[], input: CheckoutInput) => Promise<Order | undefined>;
  retryPayment: (orderId: string) => Promise<Order | undefined>;
  transitionStatus: (orderId: string, status: OrderStatus, actor: "seller" | "admin" | "system" | "buyer", note: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  requestRefund: (orderId: string, reason: string) => void;
  clearError: () => void;
}

function buildError(code: TransactionError["code"], title: string, message: string, recoveryAction: string): TransactionError {
  return { code, title, message, recoveryAction };
}

function updateInventoryStatus(record: InventoryRecord): InventoryRecord {
  const status = record.available <= 0 ? "out_of_stock" : record.available <= record.lowStockThreshold ? "low_stock" : "in_stock";
  return { ...record, status, updatedAt: new Date().toISOString() };
}

function publishOrderSync(order: Order, title: string, body: string) {
  publishMarketplaceRealtimeEvent(
    createLocalRealtimeEvent({
      type: "sync.local",
      table: "orders",
      title,
      body,
      scope: "marketplace",
      entityId: order.id,
      metadata: {
        orderNumber: order.code,
        status: order.status,
        total: order.total,
      },
    }),
  );
}

function publishInventorySync(records: InventoryRecord[]) {
  records.forEach((record) => {
    publishMarketplaceRealtimeEvent(
      createLocalRealtimeEvent({
        type: "inventory.updated",
        table: "inventory",
        title: `${record.status.replaceAll("_", " ")} inventory update`,
        body: `${record.available} available and ${record.reserved} reserved for ${record.productId}.`,
        scope: "marketplace",
        entityId: record.productId,
        metadata: {
          available: record.available,
          reserved: record.reserved,
          stockStatus: record.status,
        },
      }),
    );
  });
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      step: "address",
      selectedAddressId: savedAddresses[0].id,
      deliverySlot: "Fastest available",
      paymentMethod: "upi",
      upiApp: "gpay",
      paymentMode: "success",
      isProcessing: false,
      atomicProgress: {
        state: "idle",
        orderIds: [],
        orderNumbers: [],
        message: "Checkout is ready.",
        retryable: false,
      },
      addresses: savedAddresses,
      inventory: createInitialInventory(),
      orders: seedOrders,
      setStep: (step) => set({ step }),
      setSelectedAddress: (selectedAddressId) => set({ selectedAddressId }),
      setDeliverySlot: (deliverySlot) => set({ deliverySlot }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setUpiApp: (upiApp) => set({ upiApp }),
      setPaymentMode: (paymentMode) => set({ paymentMode }),
      clearError: () => set({ lastError: undefined }),
      validateCart: (items) => {
        if (!items.length) return buildError("EMPTY_CART", "Your cart is empty", "Add products before starting checkout.", "Return to the marketplace and add items.");
        for (const item of items) {
          if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            return buildError("INVALID_QUANTITY", "Quantity needs attention", `${item.product.name} has an invalid quantity.`, "Adjust the quantity and try again.");
          }
          const stock = get().inventory.find((record) => record.productId === item.product.id);
          if (!stock || stock.available < item.quantity) {
            return buildError("OUT_OF_STOCK", "Stock changed before checkout", `${item.product.name} no longer has enough stock nearby.`, "Reduce quantity or remove the item.");
          }
        }
        return undefined;
      },
      beginAtomicCheckout: (idempotencyKey) =>
        set({
          isProcessing: true,
          step: "payment",
          lastError: undefined,
          atomicProgress: {
            state: "locking_inventory",
            idempotencyKey,
            orderIds: [],
            orderNumbers: [],
            message: "Locking inventory and creating a retry-safe transaction.",
            retryable: false,
          },
        }),
      confirmAtomicCheckout: (result) =>
        set({
          isProcessing: result.state === "PAYMENT_PENDING",
          step: result.state === "PAYMENT_PENDING" ? "payment" : "confirmation",
          lastOrderId: result.state === "PAYMENT_PENDING" ? undefined : result.orderIds[0],
          atomicProgress: {
            state: result.state === "PAYMENT_PENDING" ? "payment_pending" : "confirmed",
            transactionId: result.transactionId,
            orderIds: result.orderIds,
            orderNumbers: result.orderNumbers,
            paymentReference: result.payment.reference,
            message:
              result.state === "PAYMENT_PENDING"
                ? "Inventory is reserved and payment is waiting for deterministic confirmation."
                : "Order is confirmed with inventory reserved for fulfillment.",
            retryable: result.state === "PAYMENT_PENDING",
          },
        }),
      failAtomicCheckout: (message) =>
        set({
          isProcessing: false,
          atomicProgress: {
            state: "failed",
            orderIds: [],
            orderNumbers: [],
            message,
            retryable: true,
          },
          lastError: buildError("CHECKOUT_RETRY", "Checkout did not complete", message, "Retry checkout with the same idempotency key to avoid duplicate orders or charges."),
        }),
      placeOrder: async (items, input) => {
        const error = get().validateCart(items);
        if (error) {
          set({ lastError: error });
          return undefined;
        }

        set({ isProcessing: true, lastError: undefined, step: "payment" });
        const now = new Date().toISOString();
        const orderIndex = get().orders.length;
        const code = formatOrderCode(orderIndex);
        const pricing = calculateOrderPricing(items);
        const codEligibility = checkCodEligibility({ items, total: pricing.total, pincode: input.address.pincode });
        if (input.paymentMethod === "cod" && !codEligibility.eligible) {
          set({
            isProcessing: false,
            lastError: buildError("PAYMENT_FAILED", "COD is not available", codEligibility.reason ?? "Choose UPI or another prepaid mode for this order.", "Switch payment mode and place the order again."),
          });
          return undefined;
        }
        const intent = createRazorpayCommerceIntent(pricing, code, input.paymentMethod, input.paymentMethod === "upi" ? get().upiApp : undefined);
        const payment = await processCommercePayment(intent, get().paymentMode);

        if (payment.status === PaymentStatus.Failed) {
          set({
            isProcessing: false,
            lastError: buildError("PAYMENT_FAILED", "Payment was not completed", payment.failureReason ?? "Razorpay did not complete this attempt.", "Retry payment or choose another method."),
          });
          return undefined;
        }

        const id = `order-${code.toLowerCase()}`;
        const status = payment.status === PaymentStatus.Succeeded || payment.status === PaymentStatus.CodPending ? OrderStatus.Confirmed : OrderStatus.Pending;
        const history = [
          { id: `hist-${id}-created`, status: OrderStatus.Pending, title: "Order created", note: "Stock validated and order shell created.", actor: "system" as const, createdAt: now },
          {
            id: `hist-${id}-payment`,
            status,
            title: payment.status === PaymentStatus.Succeeded ? "Payment successful" : payment.status === PaymentStatus.CodPending ? "COD confirmation pending" : "Payment processing",
            note:
              payment.status === PaymentStatus.Succeeded
                ? "Razorpay payment captured and verified for marketplace processing."
                : payment.status === PaymentStatus.CodPending
                  ? "Cash on delivery order accepted with operational verification placeholder."
                  : "Awaiting payment gateway webhook confirmation.",
            actor: payment.method === "cod" ? "system" as const : "payment_gateway" as const,
            createdAt: payment.updatedAt,
          },
        ];
        const orderShell: Order = {
          id,
          code,
          status,
          items,
          buyerName: input.address.recipient,
          buyerPhone: input.address.phone,
          deliveryAddress: input.address,
          pricing,
          payment,
          history,
          auditTrail: [
            { id: `aud-${id}-created`, action: "order_created", targetId: id, actor: "system", createdAt: now, metadata: { code, itemCount: items.length, total: pricing.total } },
            { id: `aud-${id}-inventory`, action: "inventory_decremented", targetId: id, actor: "system", createdAt: now, metadata: { itemCount: items.length } },
            { id: `aud-${id}-payment`, action: "payment_state_changed", targetId: id, actor: "payment_gateway", createdAt: payment.updatedAt, metadata: { paymentStatus: payment.status, reference: payment.reference } },
          ],
          notifications: [
            { id: `not-${id}-placed`, event: "order_placed", orderId: id, title: "Order placed", body: `${code} has been created.`, createdAt: now, delivered: false },
            { id: `not-${id}-payment`, event: payment.status === PaymentStatus.Succeeded ? "payment_success" : "order_placed", orderId: id, title: payment.status === PaymentStatus.Succeeded ? "Payment successful" : "Payment pending", body: `Reference ${payment.reference}.`, createdAt: payment.updatedAt, delivered: false },
          ],
          sellerNote: input.orderNote,
          supportReference: `SUP-${code.replace("KX-", "26")}`,
          invoiceState: "placeholder_ready",
          cod: payment.method === "cod" ? { ...codEligibility, confirmedAt: undefined } : undefined,
          total: pricing.total,
          currency: pricing.currency,
          createdAt: now,
          updatedAt: payment.updatedAt,
        };
        const invoice = generateGstInvoice({ order: orderShell });
        const settlement = generateSettlement({ order: orderShell });
        const order: Order = { ...orderShell, invoice, invoiceState: "download_ready", settlement };

        const inventory = get().inventory.map((record) => {
          const item = items.find((cartItem) => cartItem.product.id === record.productId);
          return item ? updateInventoryStatus({ ...record, available: record.available - item.quantity }) : record;
        });

        set((state) => ({
          isProcessing: false,
          step: "confirmation",
          lastOrderId: id,
          orders: [order, ...state.orders],
          inventory,
        }));
        publishOrderSync(order, `${code} placed`, "Buyer, seller, tracking, and notification surfaces received the optimistic order event.");
        publishInventorySync(inventory.filter((record) => items.some((item) => item.product.id === record.productId)));
        return order;
      },
      retryPayment: async (orderId) => {
        const order = get().orders.find((item) => item.id === orderId);
        if (!order) return undefined;
        set({ isProcessing: true, lastError: undefined });
        const payment = await processCommercePayment(order.payment.method === "cod" ? { ...order.payment, method: "upi", status: PaymentStatus.IntentCreated } : order.payment, "success");
        const updated = {
          ...order,
          payment,
          status: OrderStatus.Confirmed,
          updatedAt: payment.updatedAt,
          invoice: generateGstInvoice({ order: { ...order, payment } }),
          invoiceState: "download_ready" as const,
          settlement: generateSettlement({ order: { ...order, payment } }),
          history: [...order.history, { id: `hist-${order.id}-retry`, status: OrderStatus.Confirmed, title: "Payment recovered", note: "Retry completed and transaction state synchronized.", actor: "payment_gateway" as const, createdAt: payment.updatedAt }],
          auditTrail: [...order.auditTrail, { id: `aud-${order.id}-retry`, action: "payment_state_changed", targetId: order.id, actor: "payment_gateway" as const, createdAt: payment.updatedAt, metadata: { paymentStatus: payment.status, reference: payment.reference } }],
        };
        set((state) => ({ isProcessing: false, orders: state.orders.map((item) => (item.id === orderId ? updated : item)) }));
        publishOrderSync(updated, `${updated.code} payment recovered`, "Payment state synchronized across the live transaction surfaces.");
        return updated;
      },
      transitionStatus: (orderId, status, actor, note) =>
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order;
            try {
              const updated = transitionOrder(order, status, actor, note).order;
              publishOrderSync(updated, `${updated.code} moved to ${status.toLowerCase().replaceAll("_", " ")}`, note);
              return updated;
            } catch {
              return order;
            }
          }),
        })),
      cancelOrder: (orderId, reason) =>
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order;
            try {
              const result = transitionOrder(order, OrderStatus.Cancelled, "buyer", reason);
              return { ...result.order, cancellation: { requestedAt: new Date().toISOString(), reason, status: "approved_placeholder" } };
            } catch {
              return order;
            }
          }),
        })),
      requestRefund: (orderId, reason) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  payment: { ...order.payment, status: PaymentStatus.RefundPending, updatedAt: new Date().toISOString() },
                  refund: { requestedAt: new Date().toISOString(), reason, status: "under_review" },
                  auditTrail: [...order.auditTrail, { id: `aud-${order.id}-refund`, action: "refund_requested", targetId: order.id, actor: "buyer", createdAt: new Date().toISOString(), metadata: { reason } }],
                }
              : order,
          ),
        })),
    }),
    { name: "vendorhub-checkout-transaction-store" },
  ),
);
