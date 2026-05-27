"use client";

import { Search, X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IntelligentProductGrid } from "@/components/commerce/intelligent-product-grid";
import { EmptyState } from "@/components/feedback/empty-state";
import { SearchSkeleton } from "@/components/feedback/search-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSemanticMarketplaceSearch } from "@/features/intelligence/queries";
import { trendingSearches } from "@/features/intelligence/marketplace-insights";
import { localizeCategory } from "@/features/localization/catalog";
import { marketplaceCategories, marketplaceProducts } from "@/features/marketplace/lib/data";
import { useCurrentLocale } from "@/components/i18n/language-switcher";
import { useLocationStore } from "@/store/location-store";
import { useSearchStore } from "@/store/search-store";
import { useIntelligenceStore } from "@/store/intelligence-store";
import type { Product } from "@/types";

export function SearchExperience({ initialQuery = "", products = marketplaceProducts }: { initialQuery?: string; products?: Product[] }) {
  const { t } = useTranslation();
  const locale = useCurrentLocale();
  const query = useSearchStore((state) => state.query);
  const filters = useSearchStore((state) => state.filters);
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const nearbyOnly = useLocationStore((state) => state.nearbyOnly);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setCategory = useSearchStore((state) => state.setCategory);
  const setAvailability = useSearchStore((state) => state.setAvailability);
  const setSort = useSearchStore((state) => state.setSort);
  const reset = useSearchStore((state) => state.reset);
  const recordEvent = useIntelligenceStore((state) => state.recordEvent);
  const geoFilters = { ...filters, radiusKm, nearbyOnly };
  const { data, isLoading, isError } = useSemanticMarketplaceSearch(query, geoFilters, products, currentLocation, locale);
  const categories = marketplaceCategories.map((item) => localizeCategory(item, locale));

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                recordEvent({ type: "search_interaction", query: event.target.value, source: "search_input" });
              }}
              className="h-11 pl-9"
              placeholder={t("search.placeholder")}
              aria-label={t("search.aria")}
            />
          </div>
          <select
            className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm"
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
          <select className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm" value={filters.availability} onChange={(event) => setAvailability(event.target.value as any)} aria-label={t("search.availability")}>
            <option value="available">{t("common.availableNow")}</option>
            <option value="all">{t("search.includeUnavailable")}</option>
          </select>
          <select className="focus-ring h-11 rounded-md border border-border bg-surface px-3 text-sm" value={filters.sort} onChange={(event) => setSort(event.target.value as any)} aria-label={t("search.sort")}>
            <option value="intelligent">{t("common.smartMatch")}</option>
            <option value="nearest">{t("common.nearestFirst")}</option>
            <option value="fastest">{t("common.fastestDelivery")}</option>
            <option value="rating">{t("common.highestRated")}</option>
            <option value="price-low">{t("common.priceLow")}</option>
            <option value="availability">{t("common.mostAvailable")}</option>
          </select>
          <div className="flex h-11 items-center rounded-md border border-border bg-slate-50 px-3 text-sm font-medium text-secondary-text">
            {currentLocation.locality} · {radiusKm} km
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {query ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> {t("common.clearSearch")}
            </Button>
          ) : null}
          {(data?.suggestions.length ? data.suggestions : trendingSearches).slice(0, 6).map((term) => (
            <button key={term} type="button" onClick={() => setQuery(term)} className="min-h-11 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-secondary-text focus-ring hover:text-primary-text">
              {term}
            </button>
          ))}
        </div>
        {data ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-primary-text">{t("search.resultsFor", { count: data.results.length, query: query || t("common.allCategories") })}</p>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <SearchSkeleton />
      ) : isError ? (
        <EmptyState icon={Search} title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
      ) : data?.results.length ? (
        <IntelligentProductGrid products={data.results} />
      ) : (
        <div className="space-y-3">
          <EmptyState
            icon={Search}
            title={t("search.emptyTitle")}
            description={t("search.emptyDescription")}
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
