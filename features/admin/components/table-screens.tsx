"use client";

import Link from "next/link";
import { Archive, ClipboardList, Eye, Flag, ListChecks, Plus, ShieldCheck, Store, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatting/currency";
import { useCheckoutStore } from "@/store/checkout-store";
import { PaymentStateIndicator } from "@/features/transactions/components/payment-state-indicator";
import { useAdminStore } from "../store";
import { useCategories, useModeration, useOrders, useRefunds, useVendors } from "../queries";
import type { CategoryNode, ModerationCase, PlatformOrder, RefundCase, VendorApplication } from "../types";
import { labelize, moderationTone, severityTone, vendorTone } from "../utils";
import { CategoryForm } from "./forms";
import { GovernanceBadge } from "./governance-badge";
import { GovernanceCard } from "./governance-card";
import { GovernanceTable, type GovernanceColumn } from "./governance-table";
import { GovernanceTableSkeleton } from "./loading";

export function VendorsScreen() {
  const { data = [], isLoading } = useVendors();
  const search = useAdminStore((state) => state.governanceSearch);
  const setSearch = useAdminStore((state) => state.setGovernanceSearch);
  const status = useAdminStore((state) => state.vendorStatus);
  const setStatus = useAdminStore((state) => state.setVendorStatus);
  if (isLoading) return <GovernanceTableSkeleton />;
  const rows = data.filter((vendor) => (status === "all" || vendor.status === status) && [vendor.businessName, vendor.owner, vendor.category, vendor.zone].join(" ").toLowerCase().includes(search.toLowerCase()));
  const columns: GovernanceColumn<VendorApplication>[] = [
    { key: "seller", header: "Seller", sortable: true, render: (vendor) => <Link href={`/admin/vendors/${vendor.id}`} className="block rounded-sm focus-ring"><p className="font-medium text-primary-text">{vendor.businessName}</p><p className="text-xs text-secondary-text">{vendor.owner}</p></Link> },
    { key: "category", header: "Category", render: (vendor) => vendor.category },
    { key: "zone", header: "Zone", render: (vendor) => vendor.zone },
    { key: "status", header: "Status", render: (vendor) => <GovernanceBadge label={vendor.status} tone={vendorTone(vendor.status)} /> },
    { key: "risk", header: "Risk", render: (vendor) => <GovernanceBadge label={vendor.risk} tone={severityTone(vendor.risk)} /> },
    { key: "actions", header: "Actions", render: () => <div className="flex gap-2"><Button size="sm">Review</Button><Button size="sm" variant="secondary">Approve</Button></div> },
  ];
  return <GovernanceTable title="Seller governance" description="Seller approval queue, verification workflow, suspension workflow, and operational notes." rows={rows} columns={columns} searchValue={search} onSearch={setSearch} empty={<EmptyState icon={Store} title="No pending approvals" description="No sellers match the current governance filters." />} actions={<Select value={status} onValueChange={(value) => setStatus(value as any)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sellers</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="needs_review">Needs review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select>} />;
}

export function ModerationScreen({ type }: { type?: "product" | "review" }) {
  const { data = [], isLoading } = useModeration();
  const status = useAdminStore((state) => state.moderationStatus);
  const setStatus = useAdminStore((state) => state.setModerationStatus);
  if (isLoading) return <GovernanceTableSkeleton />;
  const rows = data.filter((item) => (!type || item.type === type) && (status === "all" || item.status === status));
  const columns: GovernanceColumn<ModerationCase>[] = [
    { key: "case", header: "Case", sortable: true, render: (item) => <div><p className="font-medium text-primary-text">{item.id}</p><p className="text-xs text-secondary-text">{labelize(item.type)}</p></div> },
    { key: "content", header: "Content", render: (item) => <div><p className="font-medium text-primary-text">{item.title}</p><p className="text-xs text-secondary-text">{item.seller}</p></div> },
    { key: "status", header: "Status", render: (item) => <GovernanceBadge label={item.status} tone={moderationTone(item.status)} /> },
    { key: "priority", header: "Priority", render: (item) => <GovernanceBadge label={item.priority} tone={severityTone(item.priority)} /> },
    { key: "reason", header: "Reason", className: "min-w-72", render: (item) => <p className="text-sm text-secondary-text">{item.reason}</p> },
    { key: "actions", header: "Actions", render: () => <div className="flex gap-2"><Button size="sm">Approve</Button><Button size="sm" variant="secondary">Escalate</Button></div> },
  ];
  return <GovernanceTable title={type === "product" ? "Product moderation queue" : type === "review" ? "Review moderation queue" : "Moderation command queue"} description="Structured, auditable moderation with status, priority, history, visibility toggles, and escalation workflows." rows={rows} columns={columns} empty={<EmptyState icon={ShieldCheck} title="No moderation queue" description="No cases match the current moderation filters." />} actions={<div className="flex gap-2"><Select value={status} onValueChange={(value) => setStatus(value as any)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All states</SelectItem><SelectItem value="pending_review">Pending review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="flagged">Flagged</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select><Button variant="secondary"><Archive /> Bulk action</Button></div>} />;
}

export function RefundsScreen() {
  const { data = [], isLoading } = useRefunds();
  if (isLoading) return <GovernanceTableSkeleton />;
  const columns: GovernanceColumn<RefundCase>[] = [
    { key: "refund", header: "Refund", sortable: true, render: (item) => <div><p className="font-medium text-primary-text">{item.id}</p><p className="text-xs text-secondary-text">{item.openedAt}</p></div> },
    { key: "order", header: "Order context", render: (item) => item.orderId },
    { key: "customer", header: "Customer", render: (item) => item.customer },
    { key: "seller", header: "Seller", render: (item) => item.seller },
    { key: "amount", header: "Amount", sortable: true, render: (item) => formatCurrency(item.amount) },
    { key: "status", header: "Status", render: (item) => <GovernanceBadge label={item.status} tone={item.status === "open" || item.status === "under_review" ? "warning" : "success"} /> },
    { key: "actions", header: "Decision", render: () => <Button size="sm">Review</Button> },
  ];
  return <GovernanceTable title="Refund governance" description="Refund request list with customer, seller, order context, notes, and payment decision workflow." rows={data} columns={columns} empty={<EmptyState icon={WalletCards} title="No refunds" description="No refund requests are currently awaiting governance review." />} />;
}

export function OrdersOversightScreen() {
  const { isLoading } = useOrders();
  const orders = useCheckoutStore((state) => state.orders);
  if (isLoading) return <GovernanceTableSkeleton />;
  const data: PlatformOrder[] = orders.map((order) => ({
    id: order.code,
    seller: order.items[0]?.product.vendor.name ?? "Mixed sellers",
    customer: order.buyerName,
    status: order.status.toLowerCase() as PlatformOrder["status"],
    value: order.total,
    zone: order.deliveryAddress.locality,
    signal: order.refund ? "Refund review" : order.cancellation ? "Cancellation recorded" : order.payment.status === "PENDING" ? "Payment pending" : "Healthy",
    paymentState: order.payment.status,
    transactionReference: order.payment.reference,
  }));
  const columns: GovernanceColumn<PlatformOrder>[] = [
    { key: "order", header: "Order", sortable: true, render: (item) => <p className="font-medium text-primary-text">{item.id}</p> },
    { key: "seller", header: "Seller", render: (item) => item.seller },
    { key: "customer", header: "Customer", render: (item) => item.customer },
    { key: "status", header: "Status", render: (item) => <GovernanceBadge label={item.status} tone={item.status === "cancelled" ? "danger" : item.status === "pending" ? "warning" : "info"} /> },
    { key: "payment", header: "Payment", render: (item) => {
      const source = orders.find((order) => order.code === item.id);
      return source ? <PaymentStateIndicator status={source.payment.status} /> : item.paymentState;
    } },
    { key: "transaction", header: "Transaction", render: (item) => <p className="font-mono text-xs text-secondary-text">{item.transactionReference}</p> },
    { key: "value", header: "Value", render: (item) => formatCurrency(item.value) },
    { key: "signal", header: "Operational signal", render: (item) => <div><p className="text-sm text-secondary-text">{item.signal}</p><p className="text-xs text-secondary-text">{item.transactionReference}</p></div> },
    { key: "actions", header: "Escalation", render: () => <Button size="sm" variant="secondary"><Eye /> Review</Button> },
  ];
  return <GovernanceTable title="Order governance" description="Platform-wide order monitoring with payment state, transaction references, refund workflow, and escalation visibility." rows={data} columns={columns} empty={<EmptyState icon={ClipboardList} title="No platform orders" description="Order oversight has no records for the selected scope." />} />;
}

export function CategoriesScreen() {
  const { data = [], isLoading } = useCategories();
  if (isLoading) return <GovernanceTableSkeleton />;
  const columns: GovernanceColumn<CategoryNode>[] = [
    { key: "name", header: "Category", sortable: true, render: (item) => <div><p className="font-medium text-primary-text">{item.name}</p><p className="text-xs text-secondary-text">{item.imagePlaceholder}</p></div> },
    { key: "slug", header: "Slug", render: (item) => item.slug },
    { key: "parent", header: "Hierarchy", render: (item) => item.parent },
    { key: "status", header: "Visibility", render: (item) => <GovernanceBadge label={item.status} tone={item.status === "active" ? "success" : "neutral"} /> },
    { key: "count", header: "Products", sortable: true, render: (item) => item.productCount.toLocaleString("en-IN") },
    { key: "actions", header: "Actions", render: () => <Button size="sm" variant="secondary">Edit</Button> },
  ];
  return <div className="space-y-6"><GovernanceTable title="Category management" description="Create, edit, hierarchy, visibility, slug management, image workflow, and active/inactive states." rows={data} columns={columns} empty={<EmptyState icon={ListChecks} title="No categories" description="Marketplace taxonomy records will appear here." />} actions={<Button><Plus /> Create category</Button>} /><GovernanceCard title="Create or edit category" description="Form foundation for category governance."><CategoryForm /></GovernanceCard></div>;
}

export function FlagsScreen({ flags }: { flags: import("../types").GovernanceFlag[] }) {
  const columns: GovernanceColumn<import("../types").GovernanceFlag>[] = [
    { key: "flag", header: "Flag", render: (item) => <div><p className="font-medium text-primary-text">{item.id}</p><p className="text-xs text-secondary-text">{labelize(item.type)}</p></div> },
    { key: "subject", header: "Subject", render: (item) => item.subject },
    { key: "severity", header: "Severity", render: (item) => <GovernanceBadge label={item.severity} tone={severityTone(item.severity)} /> },
    { key: "detail", header: "Detail", className: "min-w-80", render: (item) => <p className="text-sm text-secondary-text">{item.detail}</p> },
    { key: "owner", header: "Owner", render: (item) => item.owner },
    { key: "actions", header: "Actions", render: () => <Button size="sm">Triage</Button> },
  ];
  return <GovernanceTable title="Platform flags" description="Suspicious seller, review, product, and operational anomaly workflow without AI fraud scoring." rows={flags} columns={columns} empty={<EmptyState icon={Flag} title="No flags" description="Governance flags will appear here when anomalies are reported." />} />;
}
