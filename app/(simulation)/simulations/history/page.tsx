import { PageContainer } from "@/components/layout/page-container";
import { HistoryCenter } from "@/features/simulation/components/history-center";

export const metadata = { title: "Simulation History" };

export default function HistoryPage() {
  return (
    <PageContainer>
      <HistoryCenter />
    </PageContainer>
  );
}
