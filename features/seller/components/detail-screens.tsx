"use client";

import { AlertTriangle, Bell, CheckCircle2, HelpCircle, ShieldCheck, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MerchantIntelligencePanel } from "@/features/merchant-intelligence/components/merchant-intelligence-panel";
import { formatCurrency } from "@/lib/formatting/currency";
import { notifications, onboardingProgress, orders, products, sellerProfile } from "../data";
import { sellerKycProfiles } from "@/features/trust/data";
import { SellerKycPanel } from "@/features/trust/components/seller-kyc-panel";
import { useSellerDashboard } from "../queries";
import { inventoryStatus } from "../utils";
import { OnboardingForm, ProductForm, StoreSettingsForm } from "./forms";
import { SellerDashboardSkeleton } from "./loading";
import { OperationalCard } from "./operational-card";
import { StatusBadge } from "./status-badge";

export function ProductCreateScreen() {
  return (
    <OperationalCard title="Create product" description="Structured seller catalog workflow with pricing, category, inventory, media, visibility, and placeholders for future variants.">
      <ProductForm />
    </OperationalCard>
  );
}

export function ProductDetailScreen({ id }: { id: string }) {
  const product = products.find((item) => item.id === id) ?? products[0];
  return (
    <div className="space-y-6">
      <OperationalCard title={product.name} description={`${product.sku} · ${product.category}`}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Status</p><div className="mt-2"><StatusBadge status={product.status} /></div></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Visibility</p><p className="mt-2 font-semibold text-primary-text">{product.visibility.replaceAll("_", " ")}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Price</p><p className="mt-2 font-semibold text-primary-text">{formatCurrency(product.price)}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Inventory</p><div className="mt-2"><StatusBadge status={inventoryStatus(product)} /></div></div>
        </div>
      </OperationalCard>
      <OperationalCard title="Edit product" description="Draft and published state architecture prepared for marketplace catalog operations.">
        <ProductForm mode="edit" />
      </OperationalCard>
    </div>
  );
}

export function OrderDetailScreen({ id }: { id: string }) {
  const order = orders.find((item) => item.id === id) ?? orders[0];
  return (
    <div className="space-y-6">
      <OperationalCard title={`Order ${order.id}`} description={`${order.customer} · ${order.createdAt}`}>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Status</p><div className="mt-2"><StatusBadge status={order.status} /></div></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Promise</p><p className="mt-2 font-semibold text-primary-text">{order.promisedInMinutes} min</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Payment</p><p className="mt-2 font-semibold text-primary-text">{order.paymentMode}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Total</p><p className="mt-2 font-semibold text-primary-text">{formatCurrency(order.subtotal + order.deliveryFee)}</p></div>
        </div>
      </OperationalCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <OperationalCard title="Order items" description="Pick, pack, and substitution-ready breakdown.">
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.sku} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-primary-text">{item.name}</p>
                  <p className="text-xs text-secondary-text">{item.sku} · Qty {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={item.picked ? "default" : "warning"}>{item.picked ? "Picked" : "Pick pending"}</Badge>
                  <p className="font-medium text-primary-text">{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </OperationalCard>

        <OperationalCard title="Customer and fulfillment" description="Shipping is placeholder-only in this phase.">
          <div className="space-y-4 text-sm">
            <div><p className="text-xs font-medium uppercase text-secondary-text">Customer</p><p className="mt-1 font-medium text-primary-text">{order.customer}</p><p className="text-secondary-text">{order.phone}</p></div>
            <div><p className="text-xs font-medium uppercase text-secondary-text">Address</p><p className="mt-1 text-primary-text">{order.address}</p></div>
            <div><p className="text-xs font-medium uppercase text-secondary-text">Notes</p><p className="mt-1 text-primary-text">{order.notes}</p></div>
            <div className="rounded-md border border-dashed border-border bg-slate-50 p-3 text-secondary-text">Shipment preparation placeholder. No logistics dispatch integration in this phase.</div>
          </div>
        </OperationalCard>
      </div>

      <OperationalCard title="Order timeline and actions" description="Status transition architecture for seller fulfillment workflows.">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {order.timeline.map((event) => (
              <div key={event.label} className="flex gap-3">
                <div className="mt-1 flex size-6 items-center justify-center rounded-full bg-slate-100">{event.state === "done" ? <CheckCircle2 className="size-4 text-success" /> : <span className="size-2 rounded-full bg-warning" />}</div>
                <div>
                  <p className="text-sm font-medium text-primary-text">{event.label}</p>
                  <p className="text-xs text-secondary-text">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <Button>Confirm order</Button>
            <Button variant="secondary">Mark processing</Button>
            <Button variant="secondary">Mark packed</Button>
            <Button variant="outline">Prepare shipment placeholder</Button>
          </div>
        </div>
      </OperationalCard>
    </div>
  );
}

export function AnalyticsScreen() {
  const { data, isLoading } = useSellerDashboard();
  if (isLoading || !data) return <SellerDashboardSkeleton />;

  return (
    <div className="space-y-6">
      {data.intelligence ? <MerchantIntelligencePanel intelligence={data.intelligence} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <OperationalCard title="Sales overview" description="Revenue trend from live seller orders."><OperationalBarChart values={data.analytics.sales.length ? data.analytics.sales : [0]} /></OperationalCard>
        <OperationalCard title="Order trends" description="Order velocity from fulfillment lines."><OperationalBarChart values={data.analytics.orders.length ? data.analytics.orders : [0]} /></OperationalCard>
        <OperationalCard title="Inventory health" description="Fulfillment-oriented stock summary.">
          <div className="space-y-3">
            {[
              `Restock risks ${data.intelligence?.inventory.filter((item) => item.risk === "restock").length ?? 0}`,
              `Watch items ${data.intelligence?.inventory.filter((item) => item.risk === "watch").length ?? 0}`,
              `Healthy items ${data.intelligence?.inventory.filter((item) => item.risk === "healthy").length ?? 0}`,
            ].map((item) => <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{item}</div>)}
          </div>
        </OperationalCard>
      </div>
      <OperationalCard title="Category performance" description="Category movement from seller catalog and recent orders.">
        <div className="grid gap-3 sm:grid-cols-4">{data.analytics.category.map((item) => <div key={item.label} className="rounded-md border border-border p-3"><p className="text-sm font-medium text-primary-text">{item.label}</p><p className="mt-2 text-2xl font-semibold">{item.value}</p></div>)}</div>
      </OperationalCard>
      <OperationalCard title="Fulfillment optimization" description="Operational reliability, cancellation, and SLA pressure.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            `Fulfillment reliability ${data.intelligence?.fulfillment.fulfillmentRate ?? 0}%`,
            `Cancellation rate ${data.intelligence?.fulfillment.cancellationRate ?? 0}%`,
            `Delayed orders ${data.intelligence?.fulfillment.delayedOrders ?? 0}`,
          ].map((item) => <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{item}</div>)}
        </div>
      </OperationalCard>
    </div>
  );
}

export function StoreSettingsScreen() {
  return (
    <OperationalCard title="Store settings" description="Store profile, branding, contact information, operating hours placeholder, and policies placeholder.">
      <StoreSettingsForm />
    </OperationalCard>
  );
}

export function NotificationsScreen() {
  return (
    <OperationalCard title="Notification center" description="Operational notifications UI prepared for new orders, inventory alerts, admin alerts, and payout alerts.">
      <div className="space-y-3">
        {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="Seller alerts will appear here when operations need attention." /> : notifications.map((notification) => (
          <div key={notification.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Bell className="size-4 text-secondary-text" /><p className="font-medium text-primary-text">{notification.title}</p>{!notification.read ? <Badge variant="warning">Unread</Badge> : null}</div>
              <p className="mt-1 text-sm text-secondary-text">{notification.detail}</p>
            </div>
            <p className="text-xs font-medium text-secondary-text">{notification.time}</p>
          </div>
        ))}
      </div>
    </OperationalCard>
  );
}

export function OnboardingScreen() {
  const profile = sellerKycProfiles[0];
  return (
    <div className="space-y-6">
      <OperationalCard title="Seller onboarding" description="Business information, store branding, verification placeholders, category selection, progress, validation, and completion UX.">
        <div className="grid gap-3 md:grid-cols-5">
          {onboardingProgress.map((step) => (
            <div key={step.step} className="rounded-md border border-border bg-slate-50 p-3">
              <div className="flex items-center gap-2">{step.complete ? <CheckCircle2 className="size-4 text-success" /> : <AlertTriangle className="size-4 text-warning" />}<p className="text-sm font-medium text-primary-text">{step.label}</p></div>
            </div>
          ))}
        </div>
      </OperationalCard>
      <OperationalCard title="Onboarding workspace" description={`${sellerProfile.storeName} can complete business identity, documents, GST, and payout readiness review.`}>
        <OnboardingForm />
      </OperationalCard>
      <SellerKycPanel sellerId={profile.sellerId} />
    </div>
  );
}

export function PayoutsPlaceholderScreen() {
  return <EmptyState icon={WalletCards} title="Payouts placeholder" description="Payment settlement and payout operations are intentionally deferred. This page reserves seller navigation and trust context for a later phase." />;
}

export function SupportPlaceholderScreen() {
  return <EmptyState icon={HelpCircle} title="Seller support placeholder" description="Support workflows, dispute tooling, and case operations will be implemented in a later operational phase." actionLabel="View operations dashboard" />;
}

export function TrustPanel() {
  return (
    <OperationalCard title="Seller trust indicators" description="Operational trust is visible even before deeper governance systems.">
      <div className="grid gap-3 md:grid-cols-3">
        {[sellerProfile.verification, sellerProfile.fulfillmentHealth, `Seller rating placeholder ${sellerProfile.rating}`].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-3"><ShieldCheck className="size-4 text-success" /><span className="text-sm font-medium text-primary-text">{item}</span></div>
        ))}
      </div>
    </OperationalCard>
  );
}
