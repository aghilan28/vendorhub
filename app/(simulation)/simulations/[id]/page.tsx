import { PageContainer } from "@/components/layout/page-container";
import { SimulationDetail } from "@/features/simulation/components/detail-screen";

export const metadata = { title: "Simulation detail" };

export default async function SimulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <SimulationDetail simulationId={id} />
    </PageContainer>
  );
}
