import { PageContainer } from "@/components/layout/page-container";
import { BuyerSmartDiscovery } from "@/features/marketplace-intelligence/components/buyer-smart-discovery";
import { getBuyerDiscoveryIntelligence } from "@/lib/marketplace-intelligence/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Discover",
  description: "Trending products, personalized picks and availability predictions from live marketplace activity.",
};

export default async function DiscoverPage() {
  const result = await getBuyerDiscoveryIntelligence();
  return (
    <PageContainer className="space-y-6">
      <BuyerSmartDiscovery intelligence={result.intelligence} sampled={result.sampled} />
    </PageContainer>
  );
}
