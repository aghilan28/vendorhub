import { PageContainer } from "@/components/layout/page-container";
import { HistoryCenter } from "@/features/secis/components/history-center";

export const metadata = { title: "History & Audit" };

export default function HistoryPage() {
  return (
    <PageContainer>
      <HistoryCenter />
    </PageContainer>
  );
}
