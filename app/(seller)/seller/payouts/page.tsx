import { PageContainer } from "@/components/layout/page-container";
import { SellerPayoutsScreen } from "@/features/commerce-finance/components/seller-payouts-screen";

export const metadata = {
  title: "Payouts",
  description: "Seller earnings, settlement ledger and payout history.",
};

export default function SellerPayoutsPage() {
  return (
    <PageContainer>
      <SellerPayoutsScreen />
    </PageContainer>
  );
}
