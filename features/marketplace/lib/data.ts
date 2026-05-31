import { OrderStatus, PaymentStatus, type Category, type Order, type Product, type Vendor } from "@/types";
import { buildStorefrontCatalog } from "@/lib/product-population";

// PP-4 activation: the storefront fallback is populated from the PP-4 product universe so the
// homepage / category / product / search pages render real products even without a database.
const populatedCatalog = buildStorefrontCatalog();

export const marketplaceVendors: Vendor[] = populatedCatalog.vendors;

export const marketplaceCategories: Category[] = populatedCatalog.categories;

export const marketplaceProducts: Product[] = populatedCatalog.products;

export const featuredDeals: Product[] = populatedCatalog.featured;

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

export function formatEta(minutes?: number) {
  return minutes ? `${minutes}-${minutes + 8} min` : "Slot pending";
}

export const emptyOrderDefaults = {
  orderStatus: OrderStatus.Pending,
  paymentStatus: PaymentStatus.Pending,
};
