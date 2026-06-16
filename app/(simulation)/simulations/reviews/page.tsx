import { PageContainer } from "@/components/layout/page-container";
import { ReviewsScreen } from "@/features/simulation/components/reviews-screen";

export const metadata = { title: "Reviews & Approvals" };

export default function ReviewsPage() {
  return (
    <PageContainer>
      <ReviewsScreen />
    </PageContainer>
  );
}
