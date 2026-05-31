import { PageContainer } from "@/components/layout/page-container";
import { SellerIntelligenceBriefing } from "@/features/marketplace-intelligence/components/seller-intelligence-briefing";
import { getSellerIntelligenceBriefing, type MarketplaceIntelligenceResult } from "@/lib/marketplace-intelligence/queries";
import { buildMarketplaceIntelligence, SAMPLE_MARKETPLACE_INPUT } from "@/lib/marketplace-intelligence";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intelligence Briefing",
  description: "Your daily demand, inventory, pricing and growth intelligence from live store data.",
};

export default async function SellerIntelligencePage() {
  let result: MarketplaceIntelligenceResult;
  try {
    result = await getSellerIntelligenceBriefing();
  } catch {
    result = { configured: false, sampled: true, generatedAt: new Date().toISOString(), intelligence: buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT) };
  }
  return (
    <PageContainer className="space-y-6">
      <SellerIntelligenceBriefing snapshot={result.intelligence} sampled={result.sampled} />
    </PageContainer>
  );
}
