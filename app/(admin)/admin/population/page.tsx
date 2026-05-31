import { PageContainer } from "@/components/layout/page-container";
import { MarketplacePopulationCenter } from "@/features/seller-activation/components/marketplace-population-center";
import { getMarketplacePopulationSnapshot, type PopulationResult } from "@/lib/seller-activation/queries";
import { buildGovernanceSnapshot, buildPopulationSnapshot, marketplaceRecommendations, SAMPLE_GOVERNANCE_SELLERS, SAMPLE_POPULATION_SELLERS } from "@/lib/seller-activation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace Population",
  description: "Recruitment, activation and catalog population operations.",
};

export default async function AdminPopulationPage() {
  let result: PopulationResult;
  try {
    result = await getMarketplacePopulationSnapshot();
  } catch {
    result = { configured: false, sampled: true, population: buildPopulationSnapshot(SAMPLE_POPULATION_SELLERS), governance: buildGovernanceSnapshot(SAMPLE_GOVERNANCE_SELLERS) };
  }
  const recommendations = marketplaceRecommendations(result.population, result.governance);
  return (
    <PageContainer>
      <MarketplacePopulationCenter snapshot={result.population} recommendations={recommendations} sampled={result.sampled} />
    </PageContainer>
  );
}
