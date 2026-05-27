import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { LocationControlBar } from "@/features/geo/components/location-controls";
import { SearchExperience } from "@/features/marketplace/components/filter-bar";
import { getCategoryBySlug, getProductsByCategory } from "@/features/marketplace/lib/data";

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const products = getProductsByCategory(slug);

  return (
    <PageContainer className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-3xl font-semibold text-primary-text">{category.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary-text">{category.description}</p>
      </section>
      <LocationControlBar />
      <SectionWrapper title={`Find ${category.name.toLowerCase()}`}>
        <SearchExperience products={products} />
      </SectionWrapper>
      <SectionWrapper title="Popular picks">
        <ProductGrid products={products} />
      </SectionWrapper>
    </PageContainer>
  );
}
