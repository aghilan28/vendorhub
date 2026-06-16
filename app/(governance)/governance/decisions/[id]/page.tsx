import { PageContainer } from "@/components/layout/page-container";
import { DecisionDetail } from "@/features/governance-os/components/decision-detail";

export const metadata = { title: "Decision detail" };

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <DecisionDetail decisionId={id} />
    </PageContainer>
  );
}
