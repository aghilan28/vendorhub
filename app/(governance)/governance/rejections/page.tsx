import { PageContainer } from "@/components/layout/page-container";
import { RejectionsScreen } from "@/features/governance-os/components/queues";

export const metadata = { title: "Rejections" };

export default function RejectionsPage() {
  return (
    <PageContainer>
      <RejectionsScreen />
    </PageContainer>
  );
}
