import { PageContainer } from "@/components/layout/page-container";
import { NotificationCenter } from "@/components/pwa/notification-center";
import { NotificationsScreen } from "@/features/seller/components/detail-screens";

export default function SellerNotificationsPage() {
  return (
    <PageContainer>
      <NotificationCenter />
      <NotificationsScreen />
    </PageContainer>
  );
}
