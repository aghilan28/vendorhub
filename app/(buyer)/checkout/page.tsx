import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { TransactionalCheckout } from "@/features/checkout/components/transactional-checkout";

export default function CheckoutPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Checkout" description="UPI-first checkout with COD eligibility, GST invoice generation, and secure transaction recovery.">
        <TransactionalCheckout />
      </SectionWrapper>
    </PageContainer>
  );
}
