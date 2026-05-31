import { PageContainer } from "@/components/layout/page-container";
import { AdminLocationGovernance } from "@/features/hyperlocal/components/admin-location-governance";
import { getAdminLocationSnapshot, type AdminLocationResult } from "@/lib/hyperlocal/queries";
import { buildAdminLocationSnapshot, SAMPLE_STORES } from "@/lib/hyperlocal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Location Governance",
  description: "Marketplace geography: coverage, zones, delivery network and expansion intelligence.",
};

export default async function AdminLocationPage() {
  let result: AdminLocationResult;
  try {
    result = await getAdminLocationSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildAdminLocationSnapshot(SAMPLE_STORES) };
  }
  return (
    <PageContainer>
      <AdminLocationGovernance snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
