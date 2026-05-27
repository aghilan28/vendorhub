import { AlertTriangle, BadgeIndianRupee, Boxes, ClipboardList, Flag, ShieldCheck, Store, Users } from "lucide-react";
import type {
  AdminNotification,
  AuditLogEntry,
  CategoryNode,
  GovernanceFlag,
  GovernanceMetric,
  ModerationCase,
  PlatformOrder,
  RefundCase,
  VendorApplication,
} from "./types";

export const governanceMetrics: GovernanceMetric[] = [
  { label: "Total GMV placeholder", value: "Rs 18.4L", helper: "Financial settlement not connected", tone: "neutral", icon: BadgeIndianRupee },
  { label: "Active sellers", value: "342", helper: "18 joined this week", tone: "success", icon: Store },
  { label: "Pending approvals", value: "14", helper: "5 require review today", tone: "warning", icon: ShieldCheck },
  { label: "Total orders", value: "4,892", helper: "Across 7 service zones", tone: "info", icon: ClipboardList },
  { label: "Flagged content", value: "23", helper: "4 critical escalations", tone: "danger", icon: Flag },
  { label: "Refund requests", value: "11", helper: "3 above Rs 1,000", tone: "warning", icon: AlertTriangle },
  { label: "Active buyers placeholder", value: "12.8K", helper: "Identity analytics deferred", tone: "neutral", icon: Users },
  { label: "Operational health", value: "94%", helper: "Placeholder health composite", tone: "success", icon: Boxes },
];

export const vendors: VendorApplication[] = [
  { id: "ven-greenbasket", businessName: "Greenbasket Organics", owner: "Meera Nair", category: "Fresh produce", zone: "Koramangala", status: "pending", risk: "medium", submittedAt: "Today 09:18", documents: ["GST placeholder", "Storefront photo", "Food license placeholder"], notes: "Strong neighborhood demand, verification placeholders pending.", orders30d: 0, fulfillmentRate: 0, ratingPlaceholder: "New seller" },
  { id: "ven-citymeds", businessName: "CityMeds Express", owner: "Rahul Shah", category: "Health essentials", zone: "Indiranagar", status: "needs_review", risk: "high", submittedAt: "Yesterday 16:04", documents: ["Pharmacy license placeholder", "Owner ID placeholder"], notes: "Restricted category requires manual governance review.", orders30d: 0, fulfillmentRate: 0, ratingPlaceholder: "Restricted category" },
  { id: "ven-freshline", businessName: "Freshline Local", owner: "Akash Kumar", category: "Daily essentials", zone: "Indiranagar", status: "approved", risk: "low", submittedAt: "2026-05-18", documents: ["GST placeholder", "FSSAI placeholder"], notes: "Consistent SLA, low refund rate.", orders30d: 862, fulfillmentRate: 96, ratingPlaceholder: "4.7 seller rating" },
  { id: "ven-bakerylane", businessName: "Bakery Lane", owner: "Nisha Thomas", category: "Bakery", zone: "HSR Layout", status: "suspended", risk: "high", submittedAt: "2026-05-10", documents: ["Food license placeholder"], notes: "Temporary suspension placeholder after repeated product complaints.", orders30d: 214, fulfillmentRate: 81, ratingPlaceholder: "3.9 seller rating" },
];

export const moderationCases: ModerationCase[] = [
  { id: "MOD-221", type: "product", title: "Imported Baby Formula 800g", seller: "CityMeds Express", status: "pending_review", priority: "critical", reason: "Restricted product category needs document review.", reportedAt: "Today 10:12", history: "Flag created by catalog policy placeholder." },
  { id: "MOD-224", type: "product", title: "Organic Mango Crate", seller: "Greenbasket Organics", status: "flagged", priority: "medium", reason: "Image mismatch reported by buyer operations.", reportedAt: "Today 09:40", history: "Seller notified placeholder." },
  { id: "REV-118", type: "review", title: "Review on Farm Fresh Paneer", seller: "Freshline Local", status: "pending_review", priority: "high", reason: "Review includes personal contact details.", reportedAt: "Yesterday 20:15", history: "Hidden from public pending review placeholder." },
  { id: "REV-121", type: "review", title: "Review on Sourdough", seller: "Bakery Lane", status: "approved", priority: "low", reason: "Manual review completed, no policy issue.", reportedAt: "Yesterday 14:30", history: "Approved by Trust Ops." },
];

export const refunds: RefundCase[] = [
  { id: "REF-902", orderId: "KX-1042", customer: "Ananya Kumar", seller: "Freshline Local", amount: 256, status: "under_review", reason: "Paneer quality complaint with photo evidence placeholder.", openedAt: "Today 10:58" },
  { id: "REF-906", orderId: "KX-0998", customer: "Ravi Iyer", seller: "Bakery Lane", amount: 1180, status: "open", reason: "Missing items in bulk bakery order.", openedAt: "Today 08:24" },
  { id: "REF-887", orderId: "KX-0872", customer: "Pooja Rao", seller: "Greenbasket Organics", amount: 312, status: "approved_placeholder", reason: "Out-of-stock substitution not accepted.", openedAt: "Yesterday 17:10" },
];

export const platformOrders: PlatformOrder[] = [
  { id: "KX-1042", seller: "Freshline Local", customer: "Ananya Kumar", status: "processing", value: 492, zone: "Indiranagar", signal: "Refund linked" },
  { id: "KX-1043", seller: "Freshline Local", customer: "Nisha Rao", status: "pending", value: 743, zone: "Indiranagar", signal: "SLA risk" },
  { id: "KX-1038", seller: "Bakery Lane", customer: "Vikram B", status: "cancelled", value: 1180, zone: "HSR Layout", signal: "Escalation placeholder" },
  { id: "KX-1031", seller: "Greenbasket Organics", customer: "Sana M", status: "delivered", value: 624, zone: "Koramangala", signal: "Healthy" },
];

export const categories: CategoryNode[] = [
  { id: "cat-fresh", name: "Fresh foods", slug: "fresh-foods", parent: "Marketplace root", status: "active", productCount: 1284, imagePlaceholder: "Fresh produce banner" },
  { id: "cat-dairy", name: "Dairy", slug: "dairy", parent: "Fresh foods", status: "active", productCount: 342, imagePlaceholder: "Dairy aisle placeholder" },
  { id: "cat-health", name: "Health essentials", slug: "health-essentials", parent: "Marketplace root", status: "inactive", productCount: 86, imagePlaceholder: "Restricted category placeholder" },
  { id: "cat-bakery", name: "Bakery", slug: "bakery", parent: "Fresh foods", status: "active", productCount: 214, imagePlaceholder: "Bakery shelf placeholder" },
];

export const flags: GovernanceFlag[] = [
  { id: "FLG-440", type: "suspicious_seller", severity: "critical", subject: "CityMeds Express", detail: "Restricted category seller application needs manual verification placeholder.", createdAt: "Today 10:20", owner: "Trust Ops" },
  { id: "FLG-438", type: "suspicious_product", severity: "high", subject: "Imported Baby Formula 800g", detail: "Policy-sensitive item awaiting moderation decision.", createdAt: "Today 10:12", owner: "Catalog Governance" },
  { id: "FLG-431", type: "operational_anomaly", severity: "medium", subject: "HSR refund cluster", detail: "Refund volume above daily baseline placeholder.", createdAt: "Today 08:40", owner: "Platform Ops" },
  { id: "FLG-427", type: "suspicious_review", severity: "medium", subject: "Paneer product review", detail: "Review contains personal contact details.", createdAt: "Yesterday 20:15", owner: "Trust Ops" },
];

export const auditLogs: AuditLogEntry[] = [
  { id: "AUD-9001", actor: "Asha Admin", action: "Approved category edit", target: "Dairy", timestamp: "Today 10:55", domain: "category", note: "Slug retained, visibility active." },
  { id: "AUD-8998", actor: "Rohan Trust", action: "Flagged product", target: "Imported Baby Formula 800g", timestamp: "Today 10:12", domain: "moderation", note: "Restricted product placeholder policy." },
  { id: "AUD-8992", actor: "Meera Ops", action: "Moved refund to review", target: "REF-902", timestamp: "Today 09:02", domain: "refund", note: "Customer evidence attached placeholder." },
  { id: "AUD-8988", actor: "Asha Admin", action: "Approved seller", target: "Freshline Local", timestamp: "Yesterday 17:30", domain: "seller", note: "Verification placeholders reviewed." },
];

export const adminNotifications: AdminNotification[] = [
  { id: "adm-n1", title: "Critical moderation case opened", detail: "MOD-221 needs restricted-category review.", type: "moderation", time: "4 min ago", read: false },
  { id: "adm-n2", title: "Seller approval queue above threshold", detail: "14 sellers pending, 5 due today.", type: "seller", time: "22 min ago", read: false },
  { id: "adm-n3", title: "Refund cluster placeholder", detail: "HSR Layout refund requests rose above baseline.", type: "refund", time: "1 hr ago", read: true },
  { id: "adm-n4", title: "Platform health placeholder", detail: "Future queue health and uptime signals will appear here.", type: "system", time: "Today 08:00", read: true },
];
