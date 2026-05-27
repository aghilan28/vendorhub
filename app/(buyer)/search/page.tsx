import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { LocationControlBar } from "@/features/geo/components/location-controls";
import { SearchExperience } from "@/features/marketplace/components/filter-bar";
import { listLiveProducts } from "@/lib/api/queries/products";

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const { products } = await listLiveProducts({ query: resolvedSearchParams?.q, pageSize: 48 });

  return (
    <PageContainer className="space-y-6">
      <LocationControlBar />
      <SectionWrapper title="Search local marketplace" description="Tamil, Hindi, English, and mixed-language discovery with stock, delivery, rating, and price controls.">
        <SearchExperience initialQuery={resolvedSearchParams?.q ?? ""} products={products} />
      </SectionWrapper>
    </PageContainer>
  );
}
