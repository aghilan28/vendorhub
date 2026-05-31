import { PageContainer } from "@/components/layout/page-container";
import { SellerGovernanceCenter } from "@/features/seller-activation/components/seller-governance-center";
import { getMarketplacePopulationSnapshot, type PopulationResult } from "@/lib/seller-activation/queries";
import { buildGovernanceSnapshot, buildPopulationSnapshot, marketplaceRecommendations, SAMPLE_GOVERNANCE_SELLERS, SAMPLE_POPULATION_SELLERS } from "@/lib/seller-activation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seller Governance",
  description: "Review, verify, approve and monitor sellers at scale.",
};

export default async function AdminSellersPage() {
  let result: PopulationResult;
  try {
    result = await getMarketplacePopulationSnapshot();
  } catch {
    result = { configured: false, sampled: true, population: buildPopulationSnapshot(SAMPLE_POPULATION_SELLERS), governance: buildGovernanceSnapshot(SAMPLE_GOVERNANCE_SELLERS) };
  }
  const recommendations = marketplaceRecommendations(result.population, result.governance);
  return (
    <PageContainer>
      <SellerGovernanceCenter snapshot={result.governance} recommendations={recommendations} sampled={result.sampled} />
    </PageContainer>
  );
}
