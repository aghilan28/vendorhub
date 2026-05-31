import { ProductStatus, type Category, type Product, type Vendor } from "@/types";
import { buildProductGallery, resolveProductImageUrl } from "@/lib/media";

type ProductImageRow = {
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type InventoryRow = {
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold?: number | null;
  stock_status?: string | null;
};

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  rating_average?: number | null;
  rating_count?: number | null;
  service_radius_km?: number | null;
  status?: string | null;
  metadata?: unknown;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  product_count?: number | null;
};

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  currency: string;
  status?: string | null;
  ai_index_metadata?: unknown;
  discovery_metadata?: unknown;
  vendor: VendorRow | VendorRow[] | null;
  category: CategoryRow | CategoryRow[] | null;
  images?: ProductImageRow[] | null;
  inventory?: InventoryRow[] | null;
  reviews?: Array<{ rating: number | null }> | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function metadataNumber(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" ? value[key] : undefined;
}

function metadataStrings(value: Record<string, unknown>, key: string) {
  return Array.isArray(value[key]) ? value[key].filter((item): item is string => typeof item === "string") : undefined;
}

function metadataStringRecord(value: unknown): Record<string, string> | undefined {
  const object = metadataObject(value);
  const entries = Object.entries(object).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function mapProductRowToProduct(row: ProductListRow): Product {
  const vendorRow = first(row.vendor);
  const categoryRow = first(row.category);
  const orderedImages = [...(row.images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const image = orderedImages[0];
  const gallery = buildProductGallery(row.id, row.name, row.images ?? []);
  const inventory = first(row.inventory);
  const productMeta = metadataObject(row.ai_index_metadata);
  const discoveryMeta = metadataObject(row.discovery_metadata);
  const vendorMeta = metadataObject(vendorRow?.metadata);
  const stockCount = inventory ? Math.max(0, inventory.stock_quantity - inventory.reserved_quantity) : 0;
  const reviewRatings = row.reviews?.map((review) => review.rating ?? 0).filter(Boolean) ?? [];
  const rating = reviewRatings.length
    ? reviewRatings.reduce((sum, value) => sum + value, 0) / reviewRatings.length
    : (vendorRow?.rating_average ?? metadataNumber(productMeta, "rating") ?? 0);

  const vendor: Vendor = {
    id: vendorRow?.id ?? "unknown-vendor",
    name: vendorRow?.name ?? "Vendor",
    slug: vendorRow?.slug ?? "vendor",
    rating,
    serviceStatus: vendorRow?.status === "ACTIVE" ? "open" : vendorRow?.status === "SUSPENDED" ? "paused" : "closed",
    fulfillmentPromiseMinutes: metadataNumber(vendorMeta, "averagePrepMinutes") ?? metadataNumber(discoveryMeta, "deliveryMinutes") ?? 30,
    locality: metadataString(vendorMeta, "locality") ?? metadataString(discoveryMeta, "locality") ?? "Local zone",
    city: metadataString(vendorMeta, "city") ?? metadataString(discoveryMeta, "city") ?? "Chennai",
    area: metadataString(vendorMeta, "area"),
    latitude: metadataNumber(vendorMeta, "latitude") ?? metadataNumber(discoveryMeta, "latitude"),
    longitude: metadataNumber(vendorMeta, "longitude") ?? metadataNumber(discoveryMeta, "longitude"),
    serviceRadiusKm: vendorRow?.service_radius_km ?? undefined,
    coverageNote: metadataString(vendorMeta, "coverageNote"),
    verified: vendorRow?.status === "ACTIVE",
    orderCount: metadataNumber(vendorMeta, "orderCount"),
  };

  const category: Category = {
    id: categoryRow?.id ?? "unknown-category",
    name: categoryRow?.name ?? "Category",
    slug: categoryRow?.slug ?? "category",
    description: categoryRow?.description ?? undefined,
    imageUrl: categoryRow?.image_url ?? undefined,
    productCount: categoryRow?.product_count ?? undefined,
  };

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    vendor,
    category,
    imageUrl: resolveProductImageUrl(image?.storage_path) ?? undefined,
    gallery: gallery.items.map((item) => ({
      url: item.url,
      thumbUrl: item.thumbUrl,
      alt: item.alt,
      isPrimary: item.isPrimary,
    })),
    price: row.base_price,
    originalPrice: metadataNumber(productMeta, "originalPrice"),
    currency: row.currency === "USD" ? "USD" : "INR",
    rating,
    reviewCount: vendorRow?.rating_count ?? reviewRatings.length,
    stockCount,
    status: row.status === "ACTIVE" && stockCount > 0 ? ProductStatus.Active : ProductStatus.OutOfStock,
    unit: metadataString(productMeta, "unit") ?? metadataString(discoveryMeta, "unit"),
    deliveryMinutes: metadataNumber(discoveryMeta, "deliveryMinutes") ?? vendor.fulfillmentPromiseMinutes,
    tags: metadataStrings(productMeta, "tags") ?? metadataStrings(discoveryMeta, "tags") ?? [],
    description: row.description ?? undefined,
    specs: metadataStringRecord(productMeta.specs),
    trustSignals: metadataStrings(discoveryMeta, "trustSignals") ?? [
      "Database-backed product",
      `${stockCount} available`,
      "Realtime stock synchronized",
    ],
  };
}
