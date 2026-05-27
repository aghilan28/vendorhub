import { PageContainer } from "@/components/layout/page-container";
import { StoreSettingsScreen, TrustPanel } from "@/features/seller/components/detail-screens";

export default function SellerStoreSettingsPage() {
  return (
    <PageContainer className="space-y-6">
      <StoreSettingsScreen />
      <TrustPanel />
    </PageContainer>
  );
}
