import { BarChart3, Boxes, ClipboardList, IndianRupee, ShieldAlert, Store, Truck, Users } from "lucide-react";

export const sellerMetrics = [
  { label: "Live orders", value: "18", delta: "+12%", icon: ClipboardList },
  { label: "Inventory health", value: "94%", delta: "+4%", icon: Boxes },
  { label: "Today revenue", value: "₹82K", delta: "+18%", icon: IndianRupee },
  { label: "Fulfillment SLA", value: "96%", delta: "+3%", icon: Truck },
];

export const adminMetrics = [
  { label: "Active vendors", value: "342", delta: "+8%", icon: Store },
  { label: "Open cases", value: "27", delta: "+5%", icon: ShieldAlert },
  { label: "Marketplace GMV", value: "₹18.4L", delta: "+21%", icon: BarChart3 },
  { label: "Buyer sessions", value: "12.8K", delta: "+14%", icon: Users },
];

export const activityItems = [
  { title: "Vendor capacity recalculated", meta: "Indiranagar zone · 2 min ago" },
  { title: "Refund queue policy check completed", meta: "Operations · 8 min ago" },
  { title: "Inventory exception moved to review", meta: "Freshline Local · 14 min ago" },
];
