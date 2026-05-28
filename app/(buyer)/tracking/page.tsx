import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerTrackingExperience } from "@/features/logistics/components/buyer-tracking-experience";

export default function TrackingPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Tracking" description="Live delivery timeline, ETA visibility, dispatch context, and shipment trust indicators.">
        <BuyerTrackingExperience />
      </SectionWrapper>
    </PageContainer>
  );
}
