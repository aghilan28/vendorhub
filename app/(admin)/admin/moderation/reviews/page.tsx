import { PageContainer } from "@/components/layout/page-container";
import { ModerationActionPanel } from "@/features/admin/components/detail-screens";
import { ModerationScreen } from "@/features/admin/components/table-screens";

export default function ReviewModerationPage() {
  return (
    <PageContainer className="space-y-6">
      <ModerationScreen type="review" />
      <ModerationActionPanel />
    </PageContainer>
  );
}
