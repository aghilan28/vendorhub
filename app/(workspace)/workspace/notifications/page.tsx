import { PageContainer } from "@/components/layout/page-container";
import { NotificationCenter } from "@/features/workspace/components/notification-center";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <PageContainer>
      <NotificationCenter />
    </PageContainer>
  );
}
