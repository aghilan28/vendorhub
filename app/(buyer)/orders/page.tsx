import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerOrdersClient } from "@/features/orders/components/buyer-orders-client";

export default function OrdersPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Orders" description="Your local store orders, payments, delivery updates, and support details.">
        <BuyerOrdersClient />
      </SectionWrapper>
    </PageContainer>
  );
}
