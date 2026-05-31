import { PageContainer } from "@/components/layout/page-container";
import { OnboardingWizard } from "@/features/seller-activation/components/onboarding-wizard";

export const metadata = {
  title: "Seller onboarding",
  description: "Create your VendorHub store in a guided, validated flow.",
};

export default function SellerOnboardingPage() {
  return (
    <PageContainer>
      <OnboardingWizard sampled={false} />
    </PageContainer>
  );
}
