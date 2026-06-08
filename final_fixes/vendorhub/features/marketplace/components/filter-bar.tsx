"use client";

import { Clock3, PackageSearch, Search, Tag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentLocale } from "@/components/i18n/language-switcher";
import { IntelligentProductGrid } from "@/components/commerce/intelligent-product-grid";
import { EmptyState } from "@/components/feedback/empty-state";
import { SearchSkeleton } from "@/components/feedback/search-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSemanticMarketplaceSearch } from "@/features/intelligence/queries";
import { localizeCategory } from "@/features/localization/catalog";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { useLiveCategories } from "@/features/marketplace/lib/category-queries";
import { useIntelligenceStore } from "@/store/intelligence-store";
import { useLocationStore } from "@/store/location-store";
import { useSearchStore } from "@/store/search-store";
import type { Product } from "@/types";

const sortLabels: Record<string, string> = {
  intelligent: "Recommended",
  nearest: "Nearby",
  fastest: "Fastest",
  rating: "Top rated",
  "price-low": "Lowest price",
  availability: "In stock",
};

const simpleSuggestions: string[] = [];
const recentSearches: string[] = [];

const priceLabels = [
  { value: "all", label: "Any price" },
  { value: "under-100", label: "Under Rs 100" },
  { value: "under-500", label: "Under Rs 500" },
  { value: "under-1000", label: "Under Rs 1000" },
] as const;

const ratingLabels = [
  { value: "all", label: "Any rating" },
  { value: "4-plus", label: "4.0+" },
  { value: "4-5-plus", label: "4.5+" },
] as const;

const deliveryLabels = [
  { value: "all", label: "Any time" },
  { value: "under-30", label: "Under 30 min" },
  { value: "under-45", label: "Under 45 min" },
] as const;

export function SearchExperience({ initialQuery = "", products = marketplaceProducts }: { initialQuery?: string; products?: Product[] }) {
  const { t } = useTranslation();
  const locale = useCurrentLocale();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const query = useSearchStore((state) => state.query);
  const filters = useSearchStore((state) => state.filters);
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const nearbyOnly = useLocationStore((state) => state.nearbyOnly);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setCategory = useSearchStore((state) => state.setCategory);
  const setAvailability = useSearchStore((state) => state.setAvailability);
  const setSort = useSearchStore((state) => state.setSort);
  const setPrice = useSearchStore((state) => state.setPrice);
  const setRating = useSearchStore((state) => state.setRating);
  const setDeliveryTime = useSearchStore((state) => state.setDeliveryTime);
  const reset = useSearchStore((state) => state.reset);
  const recordEvent = useIntelligenceStore((state) => state.recordEvent);
  const geoFilters = { ...filters, radiusKm, nearbyOnly };
  const { data, isLoading, isError } = useSemanticMarketplaceSearch(query, geoFilters, products, currentLocation, locale);
  const { data: rawCategories = [] } = useLiveCategories();
  const categories = rawCategories.map((item) => localizeCategory(item, locale));
  const normalizedQuery = query.trim().toLowerCase();
  const suggestedProducts = useMemo(() => {
    if (!normalizedQuery) return products.slice(0, 3);
    return products
      .filter((product) => `${product.name} ${product.category.name} ${product.vendor.name}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 3);
  }, [normalizedQuery, products]);
  const suggestedCategories = useMemo(() => {
    if (!normalizedQuery) return categories.slice(0, 3);
    return categories.filter((category) => category.name.toLowerCase().includes(normalizedQuery)).slice(0, 3);
  }, [categories, normalizedQuery]);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_170px_160px_160px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-secondary-text" />
            <Input
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 140)}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowSuggestions(true);
                recordEvent({ type: "search_interaction", query: event.target.value, source: "search_input" });
              }}
              className="h-12 rounded-full pl-12 text-base"
              placeholder="Search for products, brands, or categories..."
              aria-label={t("search.aria")}
            />
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                <div className="grid gap-1 p-2">
                  {recentSearches.slice(0, 3).map((term) => (
                    <button key={term} type="button" onMouseDown={() => setQuery(term)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm text-primary-text transition hover:bg-slate-50 focus-ring">
                      <Clock3 className="size-4 text-secondary-text" aria-hidden />
                      {term}
                    </button>
                  ))}
                  {suggestedCategories.map((category) => (
                    <Link key={category.id} href={`/categories/${category.slug}`} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-primary-text transition hover:bg-slate-50 focus-ring">
                      <Tag className="size-4 text-secondary-text" aria-hidden />
                      {category.name}
                    </Link>
                  ))}
                  {suggestedProducts.map((product) => (
                    <button key={product.id} type="button" onMouseDown={() => setQuery(product.name)} className="flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition hover:bg-slate-50 focus-ring">
                      <span className="flex min-w-0 items-center gap-3">
                        <PackageSearch className="size-4 shrink-0 text-secondary-text" aria-hidden />
                        <span className="truncate text-primary-text">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-secondary-text">{product.vendor.locality}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <select
            className="focus-ring h-12 rounded-md border border-border bg-surface px-3 text-sm"
            value={filters.category}
            onChange={(event) => {
              setCategory(event.target.value);
              recordEvent({ type: "category_explore", categorySlug: event.target.value, source: "search_filter" });
            }}
            aria-label={t("search.category")}
          >
            <option value="all">{t("common.allCategories")}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select className="focus-ring h-12 rounded-md border border-border bg-surface px-3 text-sm" value={filters.availability} onChange={(event) => setAvailability(event.target.value as any)} aria-label={t("search.availability")}>
            <option value="available">{t("common.availableNow")}</option>
            <option value="all">{t("search.includeUnavailable")}</option>
          </select>
          <select className="focus-ring h-12 rounded-md border border-border bg-surface px-3 text-sm" value={filters.sort} onChange={(event) => setSort(event.target.value as any)} aria-label={t("search.sort")}>
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm" value={filters.price ?? "all"} onChange={(event) => setPrice(event.target.value as any)} aria-label="Filter price">
            {priceLabels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm" value={filters.rating ?? "all"} onChange={(event) => setRating(event.target.value as any)} aria-label="Filter rating">
            {ratingLabels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm" value={filters.deliveryTime ?? "all"} onChange={(event) => setDeliveryTime(event.target.value as any)} aria-label="Filter delivery time">
            {deliveryLabels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {query ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> {t("common.clearSearch")}
            </Button>
          ) : null}
          {simpleSuggestions.map((term) => (
            <button key={term} type="button" onClick={() => setQuery(term)} className="min-h-11 shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-secondary-text focus-ring hover:text-primary-text">
              {term}
            </button>
          ))}
        </div>
        {data ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-primary-text">
              {query.trim() ? `${data.results.length} results for '${query.trim()}'` : `${data.results.length} products nearby`}
            </p>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <SearchSkeleton />
      ) : isError ? (
        <EmptyState icon={Search} title="Search is taking longer than usual" description="Try again in a moment or browse popular products nearby." />
      ) : data?.results.length ? (
        <IntelligentProductGrid products={data.results} />
      ) : (
        <div className="space-y-3">
          <EmptyState
            icon={Search}
            title={`No results found for '${query || "this search"}'`}
            description="The demo search index has been reset. Verified products will appear after real catalog ingestion."
            actionLabel={t("common.resetSearch")}
          />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={reset}>{t("common.resetSearch")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
