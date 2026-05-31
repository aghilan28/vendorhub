import { PageContainer } from "@/components/layout/page-container";
import { SellerReputationPanel } from "@/features/trust-os/components/seller-reputation-panel";

export const metadata = {
  title: "Reputation & Trust",
  description: "Seller reputation, trust score, badges and improvement recommendations.",
};

export default function SellerReputationPage() {
  return (
    <PageContainer className="space-y-6">
      <SellerReputationPanel />
    </PageContainer>
  );
}
