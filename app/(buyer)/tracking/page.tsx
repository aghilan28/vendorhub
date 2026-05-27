import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerTrackingExperience } from "@/features/logistics/components/buyer-tracking-experience";
import { buyerOrders } from "@/features/marketplace/lib/data";

export default function TrackingPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Tracking" description="Live delivery timeline, ETA visibility, dispatch context, and shipment trust indicators.">
        <BuyerTrackingExperience orderId={buyerOrders[0].id} />
      </SectionWrapper>
    </PageContainer>
  );
}
