import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { CartClient } from "@/features/marketplace/components/cart-client";
import { listLiveCartItems } from "@/lib/api/queries/cart";

export default async function CartPage() {
  const items = await listLiveCartItems();

  return (
    <PageContainer>
      <SectionWrapper title="Cart">
        <CartClient items={items} />
      </SectionWrapper>
    </PageContainer>
  );
}
