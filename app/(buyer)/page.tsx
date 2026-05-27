import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { HyperlocalHomepageSections } from "@/features/geo/components/hyperlocal-sections";
import { LocationControlBar } from "@/features/geo/components/location-controls";
import { HomepageRecommendationStrip } from "@/features/intelligence/components/recommendation-strip";
import { CategoryRail, DealsStrip, MarketplaceHero, VendorRail } from "@/features/marketplace/components/marketplace-sections";
import { listLiveProducts } from "@/lib/api/queries/products";

export default async function HomePage() {
  const { products } = await listLiveProducts({ pageSize: 24 });

  return (
    <PageContainer className="space-y-8">
      <MarketplaceHero />
      <LocationControlBar />
      <HyperlocalHomepageSections />
      <SectionWrapper title="Shop by local need" description="Fresh picks, daily essentials, snacks, care products, and home needs near you.">
        <CategoryRail />
      </SectionWrapper>
      <SectionWrapper title="Trending nearby" description="Popular products available from local sellers.">
        <ProductGrid products={products.slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Verified local sellers" description="Trusted shops serving your neighbourhood.">
        <VendorRail />
      </SectionWrapper>
      <SectionWrapper title="Live deals" description="Fresh offers you can add quickly.">
        <DealsStrip products={products} />
      </SectionWrapper>
      <SectionWrapper title="Recommended for you">
        <HomepageRecommendationStrip products={products} />
      </SectionWrapper>
    </PageContainer>
  );
}
