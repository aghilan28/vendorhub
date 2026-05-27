import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerTrackingExperience } from "@/features/logistics/components/buyer-tracking-experience";
import { buyerOrders } from "@/features/marketplace/lib/data";

export default async function TrackingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = buyerOrders.find((item) => item.id === id);
  if (!order) notFound();

  return (
    <PageContainer>
      <SectionWrapper title={`Tracking ${order.code}`} description="Follow your order from seller packing to delivery.">
        <BuyerTrackingExperience orderId={order.id} />
      </SectionWrapper>
    </PageContainer>
  );
}
