import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { CategoryRail } from "@/features/marketplace/components/marketplace-sections";
import { marketplaceProducts } from "@/features/marketplace/lib/data";

export default function CategoriesPage() {
  return (
    <PageContainer className="space-y-8">
      <SectionWrapper title="Categories" description="Browse local commerce lanes with operational stock and seller availability.">
        <CategoryRail />
      </SectionWrapper>
      <SectionWrapper title="Available now" description="A pagination-ready grid of products currently sellable nearby.">
        <ProductGrid products={marketplaceProducts} />
      </SectionWrapper>
    </PageContainer>
  );
}
