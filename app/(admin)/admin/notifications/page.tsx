import { PageContainer } from "@/components/layout/page-container";
import { NotificationCenter } from "@/components/pwa/notification-center";
import { AdminNotificationsScreen } from "@/features/admin/components/detail-screens";

export default function AdminNotificationsPage() {
  return (
    <PageContainer>
      <NotificationCenter />
      <AdminNotificationsScreen />
    </PageContainer>
  );
}
