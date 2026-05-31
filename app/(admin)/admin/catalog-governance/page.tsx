import { PageContainer } from "@/components/layout/page-container";
import { AdminCatalogGovernance } from "@/features/catalog-population/components/admin-catalog-governance";
import { getCatalogGovernanceSnapshot, type CatalogAdminResult } from "@/lib/catalog-population/queries";
import { buildCatalogGovernanceSnapshot, buildPopulationIntelligence, SAMPLE_GOVERNANCE_PRODUCTS, SAMPLE_POPULATION_PRODUCTS } from "@/lib/catalog-population";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catalog Governance",
  description: "Catalog review queues, quality, duplicates and population intelligence.",
};

export default async function AdminCatalogGovernancePage() {
  let result: CatalogAdminResult;
  try {
    result = await getCatalogGovernanceSnapshot();
  } catch {
    result = {
      configured: false,
      sampled: true,
      governance: buildCatalogGovernanceSnapshot(SAMPLE_GOVERNANCE_PRODUCTS),
      intelligence: buildPopulationIntelligence(SAMPLE_POPULATION_PRODUCTS),
    };
  }
  return (
    <PageContainer>
      <AdminCatalogGovernance governance={result.governance} intelligence={result.intelligence} sampled={result.sampled} />
    </PageContainer>
  );
}
