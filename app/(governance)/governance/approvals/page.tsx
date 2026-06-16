import { PageContainer } from "@/components/layout/page-container";
import { ApprovalsScreen } from "@/features/governance-os/components/queues";

export const metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <PageContainer>
      <ApprovalsScreen />
    </PageContainer>
  );
}
