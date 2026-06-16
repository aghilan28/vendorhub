import { PageContainer } from "@/components/layout/page-container";
import { HistoryCenter } from "@/features/governance-os/components/history-center";

export const metadata = { title: "Governance History" };

export default function HistoryPage() {
  return (
    <PageContainer>
      <HistoryCenter />
    </PageContainer>
  );
}
