"use client";

import { BadgeCheck, Clock3, PackageCheck, Search, Star, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/commerce/product-grid";
import { EmptyState } from "@/components/feedback/empty-state";
import { useCurrentLocale } from "@/components/i18n/language-switcher";
import { localizeCategory, localizeProduct, localizeVendor } from "@/features/localization/catalog";
import { getVendorActivityLine, getVendorHumanLine, marketplaceCategories, marketplaceProducts, marketplaceVendors } from "@/features/marketplace/lib/data";
import type { Category, Product, Vendor } from "@/types";

const heroTrustSignals = [
  { label: "0", detail: "listed products", icon: BadgeCheck },
  { label: "Ready", detail: "catalog ingestion", icon: Clock3 },
  { label: "Clean", detail: "AI/search dataset", icon: PackageCheck },
] as const;

export function MarketplaceHero() {
  return (
    <section className="rounded-lg border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/55 px-4 py-8 shadow-sm sm:px-8 sm:py-11">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-semibold leading-tight text-primary-text sm:text-5xl">
          Marketplace catalog reset for verified regional listings.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-secondary-text sm:text-lg">
          The marketplace is empty, clean, and ready for real South Indian hyperlocal catalog ingestion.
        </p>
        <form action="/search" className="mx-auto mt-7 flex max-w-3xl items-center gap-2 rounded-full border border-emerald-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] transition focus-within:border-emerald-500 focus-within:shadow-[0_20px_50px_rgba(5,150,105,0.18)]">
          <label className="sr-only" htmlFor="home-search">Search products</label>
          <Search className="ml-3 size-5 shrink-0 text-secondary-text" aria-hidden />
          <input
            id="home-search"
            name="q"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-secondary-text"
            placeholder="Search will activate after verified products are ingested"
          />
          <button type="submit" className="focus-ring min-h-12 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]">
            Search
          </button>
        </form>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {heroTrustSignals.map(({ label, detail, icon: Icon }) => (
            <div key={detail} className="rounded-lg border border-white/80 bg-white/80 px-4 py-3 text-left shadow-sm">
              <Icon className="mb-2 size-4 text-brand" aria-hidden />
              <p className="text-xl font-semibold leading-none text-primary-text">{label}</p>
              <p className="mt-1 text-sm text-secondary-text">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryRail({ categories = marketplaceCategories }: { categories?: Category[] }) {
  const locale = useCurrentLocale();
  const localizedCategories = categories.map((category) => localizeCategory(category, locale));

  if (!localizedCategories.length) {
    return <EmptyState icon={PackageCheck} title="Catalog population in progress" description="Real regional categories can now be ingested cleanly." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {localizedCategories.map((category) => (
        <Link key={category.id} href={`/categories/${category.slug}`} className="group min-h-36 rounded-lg border border-border bg-surface p-3 text-center shadow-sm transition hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(15,23,42,0.1)] focus-ring">
          <div className="relative mx-auto aspect-square max-w-28 overflow-hidden rounded-full bg-slate-100">
            {category.imageUrl ? <Image src={category.imageUrl} alt={category.name} fill sizes="20vw" className="object-cover transition group-hover:scale-105" /> : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-primary-text">{category.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-secondary-text">{category.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function VendorRail({ vendors = marketplaceVendors }: { vendors?: Vendor[] }) {
  const locale = useCurrentLocale();
  const localizedVendors = vendors.map((vendor) => localizeVendor(vendor, locale));

  if (!localizedVendors.length) {
    return <EmptyState icon={Store} title="No marketplace sellers yet" description="Seller onboarding remains available for verified real vendors." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {localizedVendors.map((vendor) => (
        <article key={vendor.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-primary-text">{vendor.name}</h3>
              <p className="mt-1 text-sm text-secondary-text">{vendor.locality}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-text">
              <Star className="size-4 fill-warning text-warning" aria-hidden /> {vendor.rating.toFixed(1)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-secondary-text">{getVendorHumanLine(vendor)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary-text">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1"><Clock3 className="size-3.5" /> {vendor.fulfillmentPromiseMinutes}-{vendor.fulfillmentPromiseMinutes + 8} min</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1"><Store className="size-3.5" /> {getVendorActivityLine(vendor)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function DealsStrip({ products = marketplaceProducts }: { products?: Product[] }) {
  const locale = useCurrentLocale();
  return <ProductGrid products={products.filter((product) => product.originalPrice).slice(0, 4).map((product) => localizeProduct(product, locale))} compact />;
}

export function MarketplaceFooter() {
  return (
    <footer className="border-t border-border py-6 text-sm text-secondary-text">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-primary-text">VendorHub</p>
        <p>Verified local sellers, fresh stock, and quick delivery across Chennai.</p>
      </div>
    </footer>
  );
}
