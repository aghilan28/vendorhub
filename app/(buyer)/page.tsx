import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { HyperlocalHomepageSections } from "@/features/geo/components/hyperlocal-sections";
import { LocationControlBar } from "@/features/geo/components/location-controls";
import { HomepageRecommendationStrip } from "@/features/intelligence/components/recommendation-strip";
import { HomepageDeliveryIntelligence } from "@/features/logistics/components/delivery-commerce-panels";
import { CategoryRail, DealsStrip, MarketplaceHero, VendorRail } from "@/features/marketplace/components/marketplace-sections";
import { listLiveProducts } from "@/lib/api/queries/products";

export default async function HomePage() {
  const { products } = await listLiveProducts({ pageSize: 24 });

  return (
    <PageContainer className="space-y-8">
      <MarketplaceHero />
      <LocationControlBar />
      <HyperlocalHomepageSections />
      <SectionWrapper title="Delivery intelligence" description="Fast delivery, same-day eligibility, and ready-to-deliver operational signals.">
        <HomepageDeliveryIntelligence />
      </SectionWrapper>
      <SectionWrapper title="Shop by local need" description="Categories are loaded from the live marketplace catalog.">
        <CategoryRail />
      </SectionWrapper>
      <SectionWrapper title="Trending nearby" description="Live products ranked by recent database activity, stock, and seller readiness.">
        <ProductGrid products={products.slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Verified local sellers" description="Seller visibility follows live vendor status and operational readiness.">
        <VendorRail />
      </SectionWrapper>
      <SectionWrapper title="Live deals" description="Discounted products are read from catalog metadata and current inventory.">
        <DealsStrip products={products} />
      </SectionWrapper>
      <SectionWrapper title="Recommended for you" description="Products ranked by nearby demand, stock confidence, seller quality, and basket-ready relevance.">
        <HomepageRecommendationStrip products={products} />
      </SectionWrapper>
    </PageContainer>
  );
}
