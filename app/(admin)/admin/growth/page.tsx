import { PageContainer } from "@/components/layout/page-container";
import { AdminGrowthOperations } from "@/features/customer-growth/components/admin-growth-operations";
import { buildSampleAdminGrowthSnapshot } from "@/lib/customer-growth";
import { getAdminGrowthSnapshot, type AdminGrowthResult } from "@/lib/customer-growth/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Growth Operations",
  description: "Marketplace demand: customers, retention, loyalty, referrals, campaigns and growth intelligence.",
};

export default async function AdminGrowthPage() {
  let result: AdminGrowthResult;
  try {
    result = await getAdminGrowthSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildSampleAdminGrowthSnapshot() };
  }
  return (
    <PageContainer>
      <AdminGrowthOperations snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
