import { PageContainer } from "@/components/layout/page-container";
import { SellerOsWorkspace } from "@/features/seller-os/components/seller-os-workspace";

export const metadata = {
  title: "Operations",
  description: "Seller Operating System: store, inventory, pricing, orders, promotions, customers, analytics and intelligence.",
};

export default function SellerOperationsPage() {
  return (
    <PageContainer className="space-y-6">
      <SellerOsWorkspace />
    </PageContainer>
  );
}
