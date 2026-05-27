import { PageContainer } from "@/components/layout/page-container";
import { ModerationActionPanel } from "@/features/admin/components/detail-screens";
import { ModerationScreen } from "@/features/admin/components/table-screens";

export default function ProductModerationPage() {
  return (
    <PageContainer className="space-y-6">
      <ModerationScreen type="product" />
      <ModerationActionPanel />
    </PageContainer>
  );
}
