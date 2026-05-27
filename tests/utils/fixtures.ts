import { OrderStatus, PaymentStatus, ProductStatus, type BuyerLocation, type CartItem, type Category, type Order, type Product, type Vendor } from "@/types";
import { calculateOrderPricing } from "@/features/transactions/pricing";

export const reliabilityBuyerLocation: BuyerLocation = {
  id: "buyer-indiranagar",
  label: "Indiranagar 12th Main",
  source: "manual",
  latitude: 12.9719,
  longitude: 77.6412,
  locality: "Indiranagar",
  city: "Bengaluru",
  pincode: "560038",
};

export const reliabilityCategory: Category = {
  id: "cat-fresh",
  name: "Fresh Produce",
  slug: "fresh-produce",
};

export function createVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "vendor-reliable-fresh",
    name: "Reliable Fresh Indiranagar",
    slug: "reliable-fresh-indiranagar",
    rating: 4.7,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 24,
    locality: "Indiranagar",
    city: "Bengaluru",
    latitude: 12.973,
    longitude: 77.64,
    serviceRadiusKm: 6,
    verified: true,
    orderCount: 8200,
    ...overrides,
  };
}

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-tomato-reliable",
    slug: "fresh-tomato-reliable",
    name: "Fresh Tomato Pack",
    vendor: createVendor(),
    category: reliabilityCategory,
    price: 80,
    currency: "INR",
    rating: 4.6,
    reviewCount: 210,
    stockCount: 12,
    status: ProductStatus.Active,
    unit: "500 g",
    deliveryMinutes: 26,
    tags: ["fresh", "tamatar", "vegetable"],
    description: "Firm local tomatoes for cooking and salads.",
    trustSignals: ["Cold packed", "Verified seller"],
    ...overrides,
  };
}

export function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = createProduct(overrides.product ? { ...overrides.product } : undefined);
  return {
    id: "cart-prod-tomato",
    product,
    quantity: 2,
    ...overrides,
  };
}

export function createOrder(overrides: Partial<Order> = {}): Order {
  const items = overrides.items ?? [createCartItem()];
  const pricing = calculateOrderPricing(items);
  const now = "2026-05-26T10:00:00.000Z";

  return {
    id: "order-reliability-1",
    code: "KX-2099",
    status: OrderStatus.Pending,
    items,
    buyerName: "Reliability Buyer",
    buyerPhone: "+919999999999",
    deliveryAddress: {
      id: "addr-1",
      label: "Home",
      recipient: "Reliability Buyer",
      phone: "+919999999999",
      line1: "12 Main Road",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    pricing,
    payment: {
      intentId: "intent-1",
      razorpayOrderId: "order_1",
      reference: "VH-TEST-1",
      method: "upi",
      status: PaymentStatus.IntentCreated,
      amount: pricing.total,
      currency: "INR",
      createdAt: now,
      updatedAt: now,
    },
    history: [],
    auditTrail: [],
    notifications: [],
    supportReference: "SUP-1",
    invoiceState: "placeholder_ready",
    total: pricing.total,
    currency: "INR",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function multilingualProducts() {
  return [
    createProduct({ id: "prod-tomato", slug: "tomato", name: "Fresh Tomato", tags: ["tamatar", "தக்காளி"], stockCount: 8 }),
    createProduct({
      id: "prod-mobile-cover",
      slug: "mobile-cover",
      name: "Shockproof Mobile Cover",
      category: { id: "cat-mobile", name: "Mobile Accessories", slug: "mobile-accessories" },
      price: 249,
      tags: ["phone case", "cover", "मोबाइल"],
      stockCount: 18,
      deliveryMinutes: 20,
    }),
    createProduct({
      id: "prod-makhana",
      slug: "roasted-makhana",
      name: "Roasted Makhana Healthy Snack",
      category: { id: "cat-snacks", name: "Snacks", slug: "snacks" },
      price: 155,
      tags: ["healthy", "snacks", "नाश्ता"],
      stockCount: 0,
      deliveryMinutes: 30,
    }),
  ];
}
