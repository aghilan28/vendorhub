import { PageContainer } from "@/components/layout/page-container";
import { PlatformHealthScreen } from "@/features/operations/components/platform-health-screen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Health",
  description: "Live production diagnostics across commerce, payments, realtime, AI, database and delivery.",
};

export default function AdminPlatformHealthPage() {
  return (
    <PageContainer>
      <PlatformHealthScreen />
    </PageContainer>
  );
}
