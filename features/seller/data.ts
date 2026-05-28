import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  IndianRupee,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { InventoryItem, OnboardingProgress, SellerMetric, SellerNotification, SellerOrder, SellerProduct } from "./types";

export const sellerProfile = {
  storeName: "Seller workspace",
  owner: "Not onboarded",
  zone: "No verified service zone",
  category: "Awaiting real seller category",
  rating: "0.0",
  verification: "Not started",
  operatingState: "Awaiting onboarding",
  fulfillmentHealth: "No live handoffs",
};

export const sellerMetrics: SellerMetric[] = [
  { label: "Orders today", value: "0", helper: "No real orders yet", tone: "neutral", icon: ClipboardList },
  { label: "Pending fulfillment", value: "0", helper: "Queue is empty", tone: "neutral", icon: PackageCheck },
  { label: "Low stock products", value: "0", helper: "No inventory ingested", tone: "neutral", icon: Boxes },
  { label: "Revenue", value: "Rs 0", helper: "No settlements yet", tone: "neutral", icon: IndianRupee },
  { label: "Cancellations", value: "0%", helper: "No order history", tone: "neutral", icon: RotateCcw },
  { label: "Fulfillment rate", value: "0%", helper: "No delivery history", tone: "neutral", icon: Truck },
];

export const products: SellerProduct[] = [];

export const inventory: InventoryItem[] = [];

export const orders: SellerOrder[] = [];

export const notifications: SellerNotification[] = [];

export const onboardingProgress: OnboardingProgress[] = [
  { step: "business", label: "Business information", complete: false },
  { step: "branding", label: "Store branding", complete: false },
  { step: "verification", label: "Verification documents", complete: false },
  { step: "categories", label: "Seller categories", complete: false },
  { step: "complete", label: "Completion review", complete: false },
];

export const trustSignals = [
  { label: "Verification", value: sellerProfile.verification, icon: BadgeCheck },
  { label: "Fulfillment health", value: sellerProfile.fulfillmentHealth, icon: Truck },
  { label: "Operating state", value: sellerProfile.operatingState, icon: PackageCheck },
];
