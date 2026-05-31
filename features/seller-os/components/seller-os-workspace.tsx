"use client";

// MCP-0C — Seller Operating System workspace.
// Runs on the REAL seller snapshot (/api/seller/snapshot via useSellerDashboard);
// falls back to a clearly-labelled sample for preview before sign-in.

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Boxes,
  Brain,
  ClipboardList,
  IndianRupee,
  Megaphone,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useSellerDashboard } from "@/features/seller/queries";
import {
  applyPromotion,
  buildSellerOs,
  detectWorkflows,
  projectConversion,
  validatePromotion,
  SAMPLE_SELLER_INPUT,
  type Promotion,
  type SellerOperatingInput,
} from "@/lib/seller-os";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "ai" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "ai" ? "text-blue-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

const TABS = [
  { value: "store", label: "Store", icon: Store },
  { value: "inventory", label: "Inventory", icon: Boxes },
  { value: "pricing", label: "Pricing", icon: Tag },
  { value: "orders", label: "Orders", icon: ClipboardList },
  { value: "promotions", label: "Promotions", icon: Megaphone },
  { value: "customers", label: "Customers", icon: Users },
  { value: "analytics", label: "Analytics", icon: Activity },
  { value: "intelligence", label: "Intelligence", icon: Brain },
] as const;

const sevTone: Record<string, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  warning: "warning",
  critical: "danger",
};

export function SellerOsWorkspace() {
  const { data, isLoading } = useSellerDashboard();

  const { input, live, externalHealth } = useMemo(() => {
    if (data && (data.products?.length || data.orders?.length)) {
      const built: SellerOperatingInput = {
        storeName: "Your store",
        storeStatus: "ACTIVE",
        products: data.products ?? [],
        inventory: data.inventory ?? [],
        orders: data.orders ?? [],
      };
      return { input: built, live: true, externalHealth: data.intelligence?.summary?.healthScore as number | undefined };
    }
    return { input: SAMPLE_SELLER_INPUT, live: false, externalHealth: undefined };
  }, [data]);

  const os = useMemo(() => buildSellerOs(input, externalHealth), [input, externalHealth]);
  const workflows = useMemo(() => detectWorkflows(os), [os]);

  const [promo, setPromo] = useState<Promotion>({ code: "SAVE10", type: "percent", value: 10, minOrder: 199, active: true });
  const promoValidation = validatePromotion(promo);
  const conversion = projectConversion(promo, os.orders.items.length || 10);
  const sampleApply = applyPromotion(promo, 500);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Seller Operating System</h1>
          <p className="text-sm text-secondary-text">Run your entire business — store, inventory, pricing, orders, promotions, customers, analytics and intelligence.</p>
        </div>
        <Badge variant={live ? "default" : "warning"}>{live ? "Live data" : "Preview (sample data)"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Store health" value={`${os.intelligence.healthScore}/100`} tone="ai" />
        <Stat label="Open orders" value={String(os.orders.open)} tone={os.orders.needsAction ? "warning" : undefined} />
        <Stat label="Low / out stock" value={`${os.inventory.low} / ${os.inventory.out}`} tone={os.inventory.out ? "danger" : os.inventory.low ? "warning" : undefined} />
        <Stat label="Revenue (tracked)" value={`Rs ${os.analytics.revenue.toLocaleString("en-IN")}`} />
      </div>

      <Tabs defaultValue="store">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* STORE */}
        <TabsContent value="store">
          <GovernanceCard title="Store management" description="Profile completeness, verification and performance." action={<BadgeCheck className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Health" value={`${os.store.score}/100`} tone="ai" />
              <Stat label="Profile completion" value={`${os.store.profileCompletion}%`} />
              <Stat label="Verified" value={os.store.verified ? "Yes" : "No"} tone={os.store.verified ? undefined : "warning"} />
            </div>
            <ul className="mt-3 space-y-2">
              {os.store.signals.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="text-primary-text">{s.label}</span>
                  <span className="flex items-center gap-2 text-secondary-text">
                    {s.value}
                    <Badge variant={s.ok ? "default" : "warning"}>{s.ok ? "ok" : "action"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory">
          <GovernanceCard title="Inventory command" description="Stockout risk, days-of-cover and reorder suggestions." action={<Boxes className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Products" value={String(os.inventory.total)} />
              <Stat label="Low" value={String(os.inventory.low)} tone={os.inventory.low ? "warning" : undefined} />
              <Stat label="Out" value={String(os.inventory.out)} tone={os.inventory.out ? "danger" : undefined} />
              <Stat label="Turnover" value={`${os.inventory.turnoverDays}d`} />
            </div>
            <div className="mt-3 space-y-2">
              {os.inventory.signals.map((s) => (
                <div key={s.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="text-primary-text">{s.name}</span>
                  <span className="flex items-center gap-2 text-xs text-secondary-text">
                    {s.available} avail · {s.velocityPerDay}/day · {s.daysOfCover === 999 ? "∞" : `${s.daysOfCover}d`} cover
                    <Badge variant={s.status === "out" ? "danger" : s.status === "low" ? "warning" : s.status === "overstock" ? "secondary" : "default"}>{s.status}</Badge>
                    {s.suggestedReorder > 0 ? <Badge variant="ai">reorder {s.suggestedReorder}</Badge> : null}
                  </span>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* PRICING */}
        <TabsContent value="pricing">
          <GovernanceCard title="Pricing command" description="Margins and price optimization recommendations." action={<Tag className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Avg margin" value={`${os.pricing.averageMarginPct}%`} />
              <Stat label="Below margin" value={String(os.pricing.belowMarginCount)} tone={os.pricing.belowMarginCount ? "warning" : undefined} />
            </div>
            <div className="mt-3 space-y-2">
              {os.pricing.signals.map((s) => (
                <div key={s.productId} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-primary-text">{s.name}</span>
                    <span className="flex items-center gap-2 text-xs text-secondary-text">
                      Rs {s.price} (MRP {s.mrp}) · {s.marginPct}% margin
                      <Badge variant={s.recommendation === "raise" ? "warning" : s.recommendation === "discount" ? "ai" : "default"}>{s.recommendation}</Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{s.rationale}</p>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders">
          <GovernanceCard title="Order operations" description="Fulfillment queue with the next legal action per order." action={<ClipboardList className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Open" value={String(os.orders.open)} />
              <Stat label="Needs action" value={String(os.orders.needsAction)} tone={os.orders.needsAction ? "warning" : undefined} />
              <Stat label="Fulfillment" value={`${os.orders.fulfillmentRate}%`} />
              <Stat label="SLA risk" value={String(os.orders.slaRisk)} tone={os.orders.slaRisk ? "danger" : undefined} />
            </div>
            <div className="mt-3 space-y-2">
              {os.orders.items.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="text-primary-text">{o.id} · {o.customer} · Rs {o.value}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={o.slaRisk ? "danger" : "secondary"}>{o.status}</Badge>
                    {o.nextActions.filter((a) => a !== "none").map((a) => (
                      <Button key={a} size="sm" variant="secondary">{a}</Button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promotions">
          <GovernanceCard title="Promotion management" description="Create a coupon/discount and preview its conversion impact." action={<Megaphone className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs text-secondary-text">Code</label>
                <Input value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-secondary-text">Type</label>
                <div className="flex gap-1">
                  {(["percent", "flat"] as const).map((t) => (
                    <Button key={t} size="sm" variant={promo.type === t ? "default" : "secondary"} onClick={() => setPromo({ ...promo, type: t })}>{t}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary-text">Value</label>
                <Input type="number" value={promo.value} onChange={(e) => setPromo({ ...promo, value: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-secondary-text">Min order</label>
                <Input type="number" value={promo.minOrder} onChange={(e) => setPromo({ ...promo, minOrder: Number(e.target.value) })} />
              </div>
            </div>
            {!promoValidation.ok ? <p className="mt-2 text-xs text-red-600">{promoValidation.errors.join(", ")}</p> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="On Rs 500 order" value={sampleApply.applied ? `-Rs ${sampleApply.discount}` : "n/a"} tone="ai" />
              <Stat label="Projected uplift" value={`+${conversion.upliftPct}%`} />
              <Stat label="Projected orders" value={String(conversion.projectedOrders)} />
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={!promoValidation.ok}>Launch promotion</Button>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers">
          <GovernanceCard title="Customer relationships" description="Segments and customer value from real orders." action={<Users className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Customers" value={String(os.customers.totalCustomers)} />
              <Stat label="Repeat rate" value={`${os.customers.repeatRate}%`} />
              <Stat label="Segments" value={String(os.customers.segments.filter((s) => s.count > 0).length)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {os.customers.segments.map((s) => (
                <Badge key={s.segment} variant={s.segment === "vip" ? "ai" : s.segment === "at_risk" ? "danger" : "secondary"}>
                  {s.segment}: {s.count} (Rs {s.revenue})
                </Badge>
              ))}
            </div>
            <ul className="mt-3 space-y-1">
              {os.customers.topCustomers.map((c) => (
                <li key={c.name} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span className="text-primary-text">{c.name}</span>
                  <span className="text-xs text-secondary-text">{c.orders} orders · Rs {Math.round(c.value)}</span>
                </li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics">
          <GovernanceCard title="Seller analytics" description="Revenue, orders and top performers." action={<IndianRupee className="size-4 text-secondary-text" />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Revenue" value={`Rs ${os.analytics.revenue.toLocaleString("en-IN")}`} />
              <Stat label="Orders" value={String(os.analytics.orders)} />
              <Stat label="AOV" value={`Rs ${os.analytics.averageOrderValue}`} />
              <Stat label="Conversion proxy" value={`${os.analytics.conversionProxy}%`} />
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold text-primary-text">Top products</p>
                <ul className="mt-2 space-y-1">
                  {os.analytics.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between text-xs"><span className="truncate text-primary-text">{p.name}</span><span className="text-secondary-text">{p.sold} sold</span></li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold text-primary-text">Top categories</p>
                <ul className="mt-2 space-y-1">
                  {os.analytics.topCategories.map((c) => (
                    <li key={c.name} className="flex justify-between text-xs"><span className="truncate text-primary-text">{c.name}</span><span className="text-secondary-text">{c.count}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* INTELLIGENCE */}
        <TabsContent value="intelligence">
          <div className="space-y-4">
            <GovernanceCard title="Seller intelligence" description="Recommendations computed on your real products, inventory, pricing and orders." action={<Brain className="size-4 text-blue-500" />}>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <Stat label="Health score" value={`${os.intelligence.healthScore}/100`} tone="ai" />
                <Stat label="Revenue forecast (30d)" value={`Rs ${os.intelligence.revenueForecast.toLocaleString("en-IN")}`} />
              </div>
              <ul className="space-y-2">
                {os.intelligence.recommendations.map((r, i) => (
                  <li key={`${r.kind}-${i}`} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevTone[r.severity]}>{r.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{r.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{r.detail}</p>
                    <p className="mt-1 text-xs font-medium text-brand">→ {r.action}</p>
                  </li>
                ))}
              </ul>
            </GovernanceCard>

            <GovernanceCard title="Active workflows" description="Workflows triggered by your live operating state." action={<AlertTriangle className="size-4 text-amber-500" />}>
              {workflows.length === 0 ? (
                <p className="text-sm text-secondary-text">No workflows triggered — operations are steady.</p>
              ) : (
                <ul className="space-y-2">
                  {workflows.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                      <span className="text-primary-text">{w.name}</span>
                      <span className="flex items-center gap-2 text-xs text-secondary-text">{w.reason}<Badge variant="warning">{w.state}</Badge></span>
                    </li>
                  ))}
                </ul>
              )}
            </GovernanceCard>
          </div>
        </TabsContent>
      </Tabs>

      {isLoading ? <p className="text-xs text-secondary-text">Loading live data…</p> : null}
    </div>
  );
}
