import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { HomepageRecommendationStrip } from "@/features/intelligence/components/recommendation-strip";
import { CategoryRail, MarketplaceFooter, MarketplaceHero, VendorRail } from "@/features/marketplace/components/marketplace-sections";
import { listLiveProducts } from "@/lib/api/queries/products";

export default async function HomePage() {
  const { products } = await listLiveProducts({ pageSize: 24 });

  return (
    <PageContainer className="space-y-10 sm:space-y-12">
      <MarketplaceHero />
      <SectionWrapper title="Categories">
        <CategoryRail />
      </SectionWrapper>
      <SectionWrapper title="Nearby products" description="Fresh picks available around you.">
        <ProductGrid products={products.slice(0, 8)} />
      </SectionWrapper>
      <SectionWrapper title="Morning essentials" description="Idli batter, coffee, bananas, and fresh breakfast picks from local stores.">
        <ProductGrid products={products.filter((product) => /breakfast|coffee|banana|batter|loaf|croissant/i.test(`${product.name} ${product.tags?.join(" ")}`)).slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Popular nearby sellers" description="Trusted shops serving your neighbourhood.">
        <VendorRail />
      </SectionWrapper>
      <SectionWrapper title="Evening snacks" description="Tea-time favourites and quick meal picks for tonight.">
        <ProductGrid products={products.filter((product) => /snack|puff|wrap|meal|makhana|biryani/i.test(`${product.name} ${product.tags?.join(" ")}`)).slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Recommended for you">
        <HomepageRecommendationStrip products={products} />
      </SectionWrapper>
      <MarketplaceFooter />
    </PageContainer>
  );
}
