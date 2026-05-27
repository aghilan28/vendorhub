export const APP_ROLES = ["BUYER", "SELLER", "ADMIN", "SUPER_ADMIN"] as const;
export const VENDOR_STATUSES = ["DRAFT", "PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "CLOSED"] as const;
export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED", "SUSPENDED"] as const;
export const STOCK_STATUSES = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "RESERVED", "DISCONTINUED"] as const;
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "PUSH"] as const;

export const STORAGE_BUCKETS = {
  productImages: "product-images",
  vendorAssets: "vendor-assets",
  profileImages: "profile-images",
} as const;

export const PROTECTED_ROUTES = ["/home", "/cart", "/checkout", "/orders", "/wishlist", "/profile", "/seller", "/admin"] as const;
export const SELLER_ROUTES = ["/seller"] as const;
export const ADMIN_ROUTES = ["/admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type VendorStatus = (typeof VENDOR_STATUSES)[number];
export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];
export type StockStatus = (typeof STOCK_STATUSES)[number];
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
