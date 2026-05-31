import { PageContainer } from "@/components/layout/page-container";
import { CustomerGrowthCenter } from "@/features/customer-growth/components/customer-growth-center";
import { buildSampleCustomerGrowthSnapshot } from "@/lib/customer-growth";
import { getCustomerGrowthSnapshot, type CustomerGrowthResult } from "@/lib/customer-growth/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rewards & Growth",
  description: "Your loyalty points, referrals, offers and personalized recommendations.",
};

export default async function RewardsPage() {
  let result: CustomerGrowthResult;
  try {
    result = await getCustomerGrowthSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildSampleCustomerGrowthSnapshot() };
  }
  return (
    <PageContainer>
      <CustomerGrowthCenter snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
