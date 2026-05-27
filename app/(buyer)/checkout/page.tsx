import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { TransactionalCheckout } from "@/features/checkout/components/transactional-checkout";

export default function CheckoutPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Checkout">
        <TransactionalCheckout />
      </SectionWrapper>
    </PageContainer>
  );
}
