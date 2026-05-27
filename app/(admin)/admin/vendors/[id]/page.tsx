import { PageContainer } from "@/components/layout/page-container";
import { VendorDetailScreen } from "@/features/admin/components/detail-screens";

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <VendorDetailScreen id={id} />
    </PageContainer>
  );
}
