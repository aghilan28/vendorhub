import { BarChart3, Boxes, ClipboardList, IndianRupee, ShieldAlert, Store, Truck, Users } from "lucide-react";

export const sellerMetrics = [
  { label: "Live orders", value: "0", delta: "Ready", icon: ClipboardList },
  { label: "Inventory health", value: "0%", delta: "Awaiting stock", icon: Boxes },
  { label: "Today revenue", value: "Rs 0", delta: "No orders", icon: IndianRupee },
  { label: "Fulfillment SLA", value: "0%", delta: "No deliveries", icon: Truck },
];

export const adminMetrics = [
  { label: "Active vendors", value: "0", delta: "Awaiting onboarding", icon: Store },
  { label: "Open cases", value: "0", delta: "Queue empty", icon: ShieldAlert },
  { label: "Marketplace GMV", value: "Rs 0", delta: "No orders", icon: BarChart3 },
  { label: "Buyer sessions", value: "0", delta: "No live demand", icon: Users },
];

export const activityItems = [
  { title: "Marketplace shell initialized", meta: "Operations - ready" },
  { title: "Catalog ingestion queue empty", meta: "Catalog - awaiting source data" },
  { title: "Governance queues ready", meta: "Trust - no seller records" },
];
