import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { CartClient } from "@/features/marketplace/components/cart-client";
import { CartCheckoutPanel } from "@/features/commerce-transaction/components/cart-checkout-panel";
import { listLiveCartItems } from "@/lib/api/queries/cart";
import { SAMPLE_CART_LINES, SAMPLE_COUPONS } from "@/lib/commerce-transaction";

export default async function CartPage() {
  const items = await listLiveCartItems();

  return (
    <PageContainer>
      <SectionWrapper title="Cart">
        <CartClient items={items} />
      </SectionWrapper>
      <SectionWrapper title="Smart cart & checkout" description="Multi-seller validation, save-for-later, coupons and a live priced quote.">
        <CartCheckoutPanel lines={SAMPLE_CART_LINES} coupons={SAMPLE_COUPONS} sampled />
      </SectionWrapper>
    </PageContainer>
  );
}
