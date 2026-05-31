import { PageContainer } from "@/components/layout/page-container";
import { SellerHyperlocal } from "@/features/hyperlocal/components/seller-hyperlocal";
import { getSellerHyperlocalSnapshot, type SellerHyperlocalResult } from "@/lib/hyperlocal/queries";
import { buildSellerHyperlocalSnapshot, SAMPLE_BUYER, SAMPLE_STORES } from "@/lib/hyperlocal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hyperlocal Operations",
  description: "Coverage, delivery radius, zone analytics and territory opportunities.",
};

export default async function SellerHyperlocalPage() {
  let result: SellerHyperlocalResult;
  try {
    result = await getSellerHyperlocalSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildSellerHyperlocalSnapshot(SAMPLE_STORES[0], undefined, [SAMPLE_BUYER]) };
  }
  return (
    <PageContainer>
      <SellerHyperlocal snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
