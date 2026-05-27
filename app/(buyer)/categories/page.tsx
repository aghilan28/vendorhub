import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { CategoryRail } from "@/features/marketplace/components/marketplace-sections";
import { marketplaceProducts } from "@/features/marketplace/lib/data";

export default function CategoriesPage() {
  return (
    <PageContainer className="space-y-8">
      <SectionWrapper title="Categories" description="Browse what you need nearby.">
        <CategoryRail />
      </SectionWrapper>
      <SectionWrapper title="Available now" description="Fresh products ready to add.">
        <ProductGrid products={marketplaceProducts} />
      </SectionWrapper>
    </PageContainer>
  );
}
