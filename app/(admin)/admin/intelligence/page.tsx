import { PageContainer } from "@/components/layout/page-container";
import { MarketplaceIntelligenceCenter } from "@/features/marketplace-intelligence/components/marketplace-intelligence-center";
import { getMarketplaceIntelligenceSnapshot, type MarketplaceIntelligenceResult } from "@/lib/marketplace-intelligence/queries";
import { buildMarketplaceIntelligence, SAMPLE_MARKETPLACE_INPUT } from "@/lib/marketplace-intelligence";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace Intelligence",
  description: "Live demand, inventory, pricing, risk and growth intelligence with execution/governance/simulation activation.",
};

export default async function AdminIntelligencePage() {
  let result: MarketplaceIntelligenceResult;
  try {
    result = await getMarketplaceIntelligenceSnapshot();
  } catch {
    result = { configured: false, sampled: true, generatedAt: new Date().toISOString(), intelligence: buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT) };
  }
  return (
    <PageContainer className="space-y-6">
      <MarketplaceIntelligenceCenter snapshot={result.intelligence} sampled={result.sampled} />
    </PageContainer>
  );
}
