import { OrderStatus, PaymentStatus, ProductStatus } from "@/types";
import type { CheckoutAddress, Order } from "@/types";
import { generateGstInvoice } from "@/features/commerce-finance/gst";
import { generateSettlement } from "@/features/commerce-finance/payouts";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { createRazorpayCommerceIntent } from "@/features/commerce-finance/razorpay";
import { calculateOrderPricing } from "./pricing";
import type { InventoryRecord } from "./types";

export const savedAddresses: CheckoutAddress[] = [
  {
    id: "addr-home-malleswaram",
    label: "Home",
    recipient: "Ananya Rao",
    phone: "+91 98765 43210",
    line1: "12, 8th Cross",
    locality: "Malleswaram",
    city: "Bengaluru",
    pincode: "560003",
    instructions: "Call before arrival. Lift available.",
  },
  {
    id: "addr-work-indiranagar",
    label: "Work",
    recipient: "Ananya Rao",
    phone: "+91 98765 43210",
    line1: "2nd Floor, CMH Road",
    locality: "Indiranagar",
    city: "Bengaluru",
    pincode: "560038",
    instructions: "Leave with reception if phone is busy.",
  },
];

export function createInitialInventory(): InventoryRecord[] {
  return marketplaceProducts.map((product) => ({
    productId: product.id,
    available: product.stockCount,
    reserved: 0,
    lowStockThreshold: product.stockCount <= 12 ? 8 : 12,
    status: product.stockCount === 0 ? "out_of_stock" : product.stockCount <= 12 ? "low_stock" : "in_stock",
    updatedAt: "2026-05-25T09:00:00.000Z",
  }));
}

const orderOneItems = [
  { id: "item-kx-1042-1", product: { ...marketplaceProducts[0], stockCount: 84, status: ProductStatus.Active }, quantity: 2 },
  { id: "item-kx-1042-2", product: { ...marketplaceProducts[2], stockCount: 22, status: ProductStatus.Active }, quantity: 1 },
];
const orderTwoItems = [
  { id: "item-kx-1038-1", product: { ...marketplaceProducts[4], stockCount: 18, status: ProductStatus.Active }, quantity: 1 },
  { id: "item-kx-1038-2", product: { ...marketplaceProducts[6], stockCount: 32, status: ProductStatus.Active }, quantity: 1 },
];

function buildSeedOrder(index: number, status: OrderStatus, createdAt: string, items: typeof orderOneItems, buyerName: string): Order {
  const code = index === 0 ? "KX-1042" : "KX-1038";
  const pricing = calculateOrderPricing(items);
  const payment = {
    ...createRazorpayCommerceIntent(pricing, code, index === 0 ? "upi" : "cod", index === 0 ? "gpay" : undefined),
    status: index === 0 ? PaymentStatus.Succeeded : PaymentStatus.CodPending,
    razorpayPaymentId: index === 0 ? "pay_VH1042UPI" : undefined,
    updatedAt: createdAt,
  };

  const orderShell: Order = {
    id: `order-${code.toLowerCase()}`,
    code,
    status,
    items,
    buyerName,
    buyerPhone: "+91 98765 43210",
    deliveryAddress: savedAddresses[index],
    pricing,
    payment,
    history: [
      { id: `hist-${code}-placed`, status: OrderStatus.Pending, title: "Order placed", note: "Payment intent created and stock validated.", actor: "system", createdAt, },
      { id: `hist-${code}-paid`, status: OrderStatus.Confirmed, title: index === 0 ? "UPI payment successful" : "COD order accepted", note: index === 0 ? "Razorpay UPI payment captured. Seller queue notified." : "Cash on delivery accepted with collection pending.", actor: index === 0 ? "payment_gateway" : "system", createdAt, },
      ...(status === OrderStatus.Processing
        ? [{ id: `hist-${code}-processing`, status: OrderStatus.Processing, title: "Processing", note: "Seller started picking and packing the order.", actor: "seller" as const, createdAt: "2026-05-25T10:58:00.000Z" }]
        : [{ id: `hist-${code}-delivered`, status: OrderStatus.Delivered, title: "Delivered", note: "Delivery completed and GST invoice made available.", actor: "system" as const, createdAt: "2026-05-23T11:18:00.000Z" }]),
    ],
    auditTrail: [
      { id: `aud-${code}-create`, action: "order_created", targetId: `order-${code.toLowerCase()}`, actor: "system", createdAt, metadata: { code, itemCount: items.length } },
      { id: `aud-${code}-payment`, action: "payment_state_changed", targetId: `order-${code.toLowerCase()}`, actor: "payment_gateway", createdAt, metadata: { status: PaymentStatus.Succeeded, reference: payment.reference } },
    ],
    notifications: [
      { id: `not-${code}-placed`, event: "order_placed", orderId: `order-${code.toLowerCase()}`, title: "Order placed", body: `${code} was placed successfully.`, createdAt, delivered: false },
      { id: `not-${code}-paid`, event: "payment_success", orderId: `order-${code.toLowerCase()}`, title: "Payment successful", body: `Sandbox payment reference ${payment.reference}.`, createdAt, delivered: false },
    ],
    supportReference: `SUP-${code.replace("KX-", "26")}`,
    invoiceState: "placeholder_ready",
    cod: index === 1 ? { eligible: true, maxAmount: 4999, verificationState: "confirmed", confirmedAt: "2026-05-23T09:36:00.000Z" } : undefined,
    total: pricing.total,
    currency: pricing.currency,
    createdAt,
    updatedAt: createdAt,
  };
  return { ...orderShell, invoice: generateGstInvoice({ order: orderShell }), invoiceState: "download_ready", settlement: generateSettlement({ order: orderShell }) };
}

export const seedOrders: Order[] = [
  buildSeedOrder(0, OrderStatus.Processing, "2026-05-25T10:42:00.000Z", orderOneItems, "Ananya Rao"),
  buildSeedOrder(1, OrderStatus.Delivered, "2026-05-23T09:30:00.000Z", orderTwoItems, "Vikram Bhat"),
];
