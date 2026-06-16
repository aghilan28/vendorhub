import { PageContainer } from "@/components/layout/page-container";
import { ActivityTimeline } from "@/features/workspace/components/activity-timeline";

export const metadata = { title: "Activity Timeline" };

export default function ActivityPage() {
  return (
    <PageContainer>
      <ActivityTimeline />
    </PageContainer>
  );
}
