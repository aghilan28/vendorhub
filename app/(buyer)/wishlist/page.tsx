import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { WishlistClient } from "@/features/marketplace/components/wishlist-client";
import { listLiveWishlistProducts } from "@/lib/api/queries/wishlist";

export default async function WishlistPage() {
  const products = await listLiveWishlistProducts();

  return (
    <PageContainer>
      <SectionWrapper title="Wishlist" description="Saved product surface synchronized with your live VendorHub account.">
        <WishlistClient products={products} />
      </SectionWrapper>
    </PageContainer>
  );
}
