import { PageContainer } from "@/components/layout/page-container";
import { RecommendationCenter } from "@/features/secis/components/recommendation-center";

export const metadata = { title: "Recommendation Center" };

export default function RecommendationsPage() {
  return (
    <PageContainer>
      <RecommendationCenter />
    </PageContainer>
  );
}
