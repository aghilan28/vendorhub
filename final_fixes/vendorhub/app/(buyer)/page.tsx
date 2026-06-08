import { ProductGrid } from "@/components/commerce/product-grid";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { HomepageRecommendationStrip } from "@/features/intelligence/components/recommendation-strip";
import { CategoryRail, MarketplaceFooter, MarketplaceHero, VendorRail } from "@/features/marketplace/components/marketplace-sections";
import { listLiveProducts } from "@/lib/api/queries/products";
import { listLiveCategories } from "@/lib/api/queries/categories";

export default async function HomePage() {
  const [productsData, categories] = await Promise.all([
    listLiveProducts({ pageSize: 24 }),
    listLiveCategories(),
  ]);
  const { products } = productsData;

  return (
    <PageContainer className="space-y-10 sm:space-y-12">
      <MarketplaceHero />
      <SectionWrapper title="Categories">
        <CategoryRail categories={categories as any} />
      </SectionWrapper>
      <SectionWrapper title="Marketplace catalog" description="Discover a wide range of verified products from trusted local sellers.">
        <ProductGrid products={products.slice(0, 8)} />
      </SectionWrapper>
      <SectionWrapper title="Regional essentials" description="Fresh produce, bakery items, and daily kirana needs delivered to your doorstep.">
        <ProductGrid products={products.filter((product) => /breakfast|coffee|banana|batter|loaf|fresh|pooja|fish|pharmacy|kirana/i.test(`${product.name} ${product.tags?.join(" ")}`)).slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Popular nearby sellers" description="Top-rated shops serving your neighbourhood.">
        <VendorRail />
      </SectionWrapper>
      <SectionWrapper title="Curated for you" description="Intelligent recommendations based on local popularity and availability.">
        <ProductGrid products={products.filter((product) => /snack|puff|wrap|meal|makhana|biryani/i.test(`${product.name} ${product.tags?.join(" ")}`)).slice(0, 4)} />
      </SectionWrapper>
      <SectionWrapper title="Recommended for you">
        <HomepageRecommendationStrip products={products} />
      </SectionWrapper>
      <MarketplaceFooter />
    </PageContainer>
  );
}
