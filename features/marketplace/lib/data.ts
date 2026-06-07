import { OrderStatus, PaymentStatus, type Category, type Order, type Product, type Vendor } from "@/types";

export const marketplaceVendors: Vendor[] = [];

export const marketplaceCategories: Category[] = [];

export const marketplaceProducts: Product[] = [];

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
  return vendor.locality ? `Verified local seller in ${vendor.locality}.` : "Verified marketplace partner.";
}

export function getVendorActivityLine(vendor: Vendor) {
  if (vendor.serviceStatus === "busy") return "Currently processing high volume";
  if (vendor.serviceStatus === "open") return "Ready for orders";
  return "Awaiting operational activation";
}

export function getProductFreshnessLine(product: Product) {
  if (product.category.slug === "fresh-produce") return "Sourced from local organic farms";
  if (product.category.slug === "bakery-breakfast") return "Baked fresh daily";
  if (product.category.slug === "ready-meals") return "Prepared in hygienic facilities";
  return "Verified quality standards";
}

export function getProductActivityLine(product: Product) {
  if (product.stockCount <= 0) return "Out of stock";
  if (product.deliveryMinutes) return `Fast dispatch: ~${product.deliveryMinutes} min`;
  return `Available from ${product.vendor.locality ?? "local store"}`;
}

export function getProductReviewSnippets(product: Product) {
  return [];
}

export function formatEta(minutes?: number) {
  return minutes ? `${minutes}-${minutes + 8} min` : "Check delivery slots at checkout";
}

export const emptyOrderDefaults = {
  orderStatus: OrderStatus.Pending,
  paymentStatus: PaymentStatus.Pending,
};
