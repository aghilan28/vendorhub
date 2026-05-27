import type { LucideIcon } from "lucide-react";

export type SellerOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type ProductStatus = "draft" | "published" | "archived";
export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock" | "archived";
export type NotificationType = "order" | "inventory" | "admin" | "payout";

export interface SellerMetric {
  label: string;
  value: string;
  helper: string;
  tone: "success" | "warning" | "danger" | "neutral";
  icon: LucideIcon;
}

export interface SellerProduct {
  id: string;
  inventoryId?: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  status: ProductStatus;
  visibility: "marketplace" | "store_only" | "hidden";
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  soldToday: number;
  imageHint: string;
  updatedAt: string;
}

export interface InventoryItem extends SellerProduct {
  aisle: string;
  batch: string;
  expiry: string;
  lastMovement: string;
}

export interface SellerOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  picked: boolean;
}

export interface SellerOrder {
  id: string;
  dbId?: string;
  customer: string;
  phone: string;
  address: string;
  status: SellerOrderStatus;
  promisedInMinutes: number;
  createdAt: string;
  paymentMode: "UPI" | "COD" | "Card";
  subtotal: number;
  deliveryFee: number;
  notes: string;
  items: SellerOrderItem[];
  timeline: Array<{ label: string; time: string; state: "done" | "current" | "next" }>;
}

export interface SellerNotification {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

export interface OnboardingProgress {
  step: string;
  label: string;
  complete: boolean;
}
