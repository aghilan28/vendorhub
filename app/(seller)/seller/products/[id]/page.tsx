import { PageContainer } from "@/components/layout/page-container";
import { ProductDetailScreen } from "@/features/seller/components/detail-screens";

export default async function SellerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <ProductDetailScreen id={id} />
    </PageContainer>
  );
}
