import { PageContainer } from "@/components/layout/page-container";
import { ReviewsScreen } from "@/features/governance-os/components/queues";

export const metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return (
    <PageContainer>
      <ReviewsScreen />
    </PageContainer>
  );
}
