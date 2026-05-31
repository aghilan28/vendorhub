import { PageContainer } from "@/components/layout/page-container";
import { SellerSupportCenter } from "@/features/seller/components/seller-support-center";

export const metadata = {
  title: "Help & Support",
  description: "Seller help topics, FAQs and contact channels.",
};

export default function SellerSupportPage() {
  return (
    <PageContainer>
      <SellerSupportCenter />
    </PageContainer>
  );
}
