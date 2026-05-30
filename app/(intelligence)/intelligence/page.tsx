import { PageContainer } from "@/components/layout/page-container";
import { IntelligenceDashboard } from "@/features/intelligence-platform/components/dashboard";

export const metadata = { title: "Intelligence Dashboard" };

export default function IntelligencePage() {
  return (
    <PageContainer>
      <IntelligenceDashboard />
    </PageContainer>
  );
}
