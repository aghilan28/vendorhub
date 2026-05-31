import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerHyperlocal } from "@/features/hyperlocal/components/buyer-hyperlocal";
import { SAMPLE_STORES } from "@/lib/hyperlocal";

export const metadata = {
  title: "Shop nearby",
  description: "Local stores that can deliver to you, ranked by proximity and serviceability.",
};

export default function NearbyPage() {
  return (
    <PageContainer>
      <SectionWrapper title="Hyperlocal" description="Discover nearby stores and products you can get delivered fast.">
        <BuyerHyperlocal stores={SAMPLE_STORES} sampled />
      </SectionWrapper>
    </PageContainer>
  );
}
