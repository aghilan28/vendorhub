import { PageContainer } from "@/components/layout/page-container";
import { RecommendationsScreen } from "@/features/simulation/components/recommendations-screen";

export const metadata = { title: "Recommendations" };

export default function RecommendationsPage() {
  return (
    <PageContainer>
      <RecommendationsScreen />
    </PageContainer>
  );
}
