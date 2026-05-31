// MCP-1A Phase 8 — Public Storefront view.
// Professional seller storefront: branding, profile, ratings, trust indicators,
// policies, store performance metrics and the store catalog.

import Link from "next/link";
import { BadgeCheck, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { storefrontTrustIndicators, type Storefront } from "@/lib/seller-activation";

export function StorefrontView({ store, sampled }: { store: Storefront; sampled: boolean }) {
  const indicators = storefrontTrustIndicators(store);

  return (
    <div className="space-y-6">
      {/* banner / header */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-28 w-full bg-gradient-to-r from-brand/20 to-brand/5" />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-lg bg-surface text-lg font-semibold text-brand shadow-sm">
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text">
                {store.name}
                {store.verified ? <BadgeCheck className="size-4 text-brand" aria-label="Verified" /> : null}
              </h1>
              <p className="text-sm text-secondary-text">{store.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-amber-600"><Star className="size-4 fill-current" /> {store.rating.toFixed(1)}</span>
            <span className="text-secondary-text">{store.reviewCount} reviews</span>
            <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview" : "Live"}</Badge>
          </div>
        </div>
      </div>

      {indicators.length ? (
        <div className="flex flex-wrap gap-1.5">
          {indicators.map((indicator) => (
            <Badge key={indicator} variant="ai"><ShieldCheck className="size-3" /> {indicator}</Badge>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Products" value={String(store.productCount)} />
        <Metric label="Trust score" value={`${store.trustScore}`} />
        <Metric label="On-time" value={`${store.metrics.onTimeRate}%`} />
        <Metric label="Fulfilment" value={`${store.metrics.fulfillmentRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <GovernanceCard title="Store catalog" description={`${store.productCount} products across ${store.categories.length} categories.`} action={<PackageCheck className="size-4 text-secondary-text" />}>
          {store.products.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {store.products.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`} className="focus-ring rounded-lg border border-border p-3 transition-colors hover:border-brand">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-primary-text">{product.name}</span>
                    <Badge variant={product.inStock ? "secondary" : "warning"}>{product.inStock ? "In stock" : "Out"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{product.category}</p>
                  <p className="mt-1 text-sm font-semibold text-primary-text">₹{product.price.toLocaleString("en-IN")}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary-text">This store has no published products yet.</p>
          )}
        </GovernanceCard>

        <div className="space-y-4">
          <GovernanceCard title="Store policies" action={<Truck className="size-4 text-secondary-text" />}>
            <dl className="space-y-2 text-sm">
              <Policy label="Returns" value={store.policies.returns} />
              <Policy label="Shipping" value={store.policies.shipping} />
              <Policy label="Cancellation" value={store.policies.cancellation} />
            </dl>
          </GovernanceCard>
          <GovernanceCard title="Categories">
            <div className="flex flex-wrap gap-1.5">
              {store.categories.map((c) => (
                <Badge key={c} variant="secondary">{c}</Badge>
              ))}
              {store.categories.length === 0 ? <p className="text-sm text-secondary-text">No categories yet.</p> : null}
            </div>
          </GovernanceCard>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-secondary-text">{label}</dt>
      <dd className="text-primary-text">{value}</dd>
    </div>
  );
}
