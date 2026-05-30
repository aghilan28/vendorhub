import { PageContainer } from "@/components/layout/page-container";
import { PolicyDetail } from "@/features/governance-os/components/policy-detail";

export const metadata = { title: "Policy detail" };

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <PolicyDetail policyId={id} />
    </PageContainer>
  );
}
