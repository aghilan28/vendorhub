import { OrderStatus, PaymentStatus, type Category, type Order, type Product, type Vendor } from "@/types";

export const marketplaceVendors: Vendor[] = [];

export const marketplaceCategories: Category[] = [];

export const marketplaceProducts: Product[] = [
  {
    id: "p1",
    slug: "nandi-valley-tomato",
    name: "Nandi Valley Tomato",
    price: 48,
    currency: "INR",
    rating: 4.7,
    stockCount: 86,
    status: "active" as any,
    vendor: {
      id: "v1",
      name: "Malleswaram Morning Basket",
      slug: "malleswaram-morning-basket",
      rating: 4.7,
      serviceStatus: "open",
      fulfillmentPromiseMinutes: 30,
      locality: "Malleswaram",
      city: "Bengaluru"
    },
    category: {
      id: "c1",
      name: "Fresh Produce",
      slug: "fresh-produce"
    },
    tags: ["tomato", "fresh"],
    deliveryMinutes: 25
  },
  {
    id: "p2",
    slug: "breakfast-banana",
    name: "Breakfast Banana",
    price: 72,
    currency: "INR",
    rating: 4.5,
    stockCount: 42,
    status: "active" as any,
    vendor: {
      id: "v1",
      name: "Malleswaram Morning Basket",
      slug: "malleswaram-morning-basket",
      rating: 4.7,
      serviceStatus: "open",
      fulfillmentPromiseMinutes: 30,
      locality: "Malleswaram",
      city: "Bengaluru"
    },
    category: {
      id: "c1",
      name: "Fresh Produce",
      slug: "fresh-produce"
    },
    tags: ["banana", "breakfast"],
    deliveryMinutes: 30
  }
];

export const featuredDeals: Product[] = [];

export const buyerOrders: Order[] = [];

export function getProductBySlug(slug: string) {
  return marketplaceProducts.find((product) => product.slug === slug);
}

export function getCategoryBySlug(slug: string) {
  return marketplaceCategories.find((category) => category.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return marketplaceProducts.filter((product) => product.category.slug === slug);
}

export function getVendorServingSince() {
  return undefined;
}

export function getVendorHumanLine(vendor: Vendor) {
  return vendor.locality ? `Seller profile ready for ${vendor.locality}.` : "Seller profile ready for real catalog ingestion.";
}

export function getVendorActivityLine(vendor: Vendor) {
  if (vendor.serviceStatus === "busy") return "Seller profile active";
  if (vendor.serviceStatus === "open") return "Seller profile ready";
  return "Seller profile awaiting activation";
}

export function getProductFreshnessLine(product: Product) {
  if (product.category.slug === "fresh-produce") return "Freshness metadata pending real catalog ingestion";
  if (product.category.slug === "bakery-breakfast") return "Batch metadata pending real catalog ingestion";
  if (product.category.slug === "ready-meals") return "Preparation metadata pending real catalog ingestion";
  return "Local stock metadata pending real catalog ingestion";
}

export function getProductActivityLine(product: Product) {
  if (product.stockCount <= 0) return "Awaiting verified inventory";
  if (product.deliveryMinutes) return `Dispatch metadata: ${product.deliveryMinutes} min`;
  return `Awaiting seller activity for ${product.vendor.locality ?? "local zone"}`;
}

export function getProductReviewSnippets(product: Product) {
  return [
    {
      name: "Catalog Ops",
      area: product.vendor.locality ?? "VendorHub",
      text: "Reviews will appear after verified real orders are available.",
    },
  ];
}

export function formatEta(minutes?: number, window?: string) {
  if (window) return window;
  return minutes ? `${minutes}-${minutes + 8} min` : "Slot pending";
}

export const emptyOrderDefaults = {
  orderStatus: OrderStatus.Pending,
  paymentStatus: PaymentStatus.Pending,
};
