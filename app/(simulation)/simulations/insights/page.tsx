import { PageContainer } from "@/components/layout/page-container";
import { InsightCenter } from "@/features/simulation/components/insight-center";

export const metadata = { title: "Insight Center" };

export default function InsightsPage() {
  return (
    <PageContainer>
      <InsightCenter />
    </PageContainer>
  );
}
