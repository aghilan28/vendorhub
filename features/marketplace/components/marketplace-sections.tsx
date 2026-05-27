"use client";

import { ArrowRight, BadgeCheck, Clock3, PackageCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ProductGrid } from "@/components/commerce/product-grid";
import { RatingDisplay } from "@/components/commerce/rating-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentLocale } from "@/components/i18n/language-switcher";
import { localizeCategory, localizeProduct, localizeVendor } from "@/features/localization/catalog";
import { marketplaceCategories, marketplaceProducts, marketplaceVendors } from "@/features/marketplace/lib/data";
import type { Category, Product, Vendor } from "@/types";

const heroTrustSignals = [
  { key: "liveVendors", icon: BadgeCheck },
  { key: "medianPromise", icon: Clock3 },
  { key: "stockChecked", icon: PackageCheck },
] as const;

export function MarketplaceHero() {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-7">
      <div>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-primary-text sm:text-4xl">
          {t("home.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary-text">
          {t("home.subtitle")}
        </p>
        <form action="/search" className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="home-search">Search products</label>
          <input
            id="home-search"
            name="q"
            className="focus-ring h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm"
            placeholder={t("home.searchPlaceholder")}
          />
          <Button className="h-11" type="submit">
            {t("home.searchButton")} <ArrowRight />
          </Button>
        </form>
        <div className="mt-5 grid gap-2 text-xs text-secondary-text sm:grid-cols-3">
          {heroTrustSignals.map(({ key, icon: Icon }) => (
            <span key={key} className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
              <Icon className="size-4 text-brand" /> {t(`home.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryRail({ categories = marketplaceCategories }: { categories?: Category[] }) {
  const locale = useCurrentLocale();
  const localizedCategories = categories.map((category) => localizeCategory(category, locale));

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {localizedCategories.map((category) => (
        <Link key={category.id} href={`/categories/${category.slug}`} className="group rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:border-emerald-200">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
            {category.imageUrl ? <Image src={category.imageUrl} alt={category.name} fill sizes="20vw" className="object-cover transition group-hover:scale-105" /> : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-primary-text">{category.name}</h3>
          <p className="mt-1 text-xs text-secondary-text">{category.productCount} local items</p>
        </Link>
      ))}
    </div>
  );
}

export function VendorRail({ vendors = marketplaceVendors }: { vendors?: Vendor[] }) {
  const locale = useCurrentLocale();
  const localizedVendors = vendors.map((vendor) => localizeVendor(vendor, locale));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {localizedVendors.map((vendor) => (
        <article key={vendor.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-primary-text">{vendor.name}</h3>
              <p className="mt-1 text-sm text-secondary-text">{vendor.locality}</p>
            </div>
            <Badge variant={vendor.serviceStatus === "open" ? "default" : "warning"}>{vendor.serviceStatus}</Badge>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <RatingDisplay rating={vendor.rating} />
            <span className="text-secondary-text">{vendor.fulfillmentPromiseMinutes} min promise</span>
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
