import { PageContainer } from "@/components/layout/page-container";
import { OrderDetailScreen } from "@/features/seller/components/detail-screens";

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <OrderDetailScreen id={id} />
    </PageContainer>
  );
}
