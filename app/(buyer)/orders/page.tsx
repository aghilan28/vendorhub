import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { BuyerOrderCenter } from "@/features/commerce-transaction/components/buyer-order-center";
import { getBuyerOrderCenterSnapshot, type TransactionResult } from "@/lib/commerce-transaction/queries";
import { buildTransactionSnapshot, SAMPLE_TRANSACTION_INPUT } from "@/lib/commerce-transaction";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let result: TransactionResult;
  try {
    result = await getBuyerOrderCenterSnapshot();
  } catch {
    result = { configured: false, sampled: true, generatedAt: new Date().toISOString(), snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
  }
  return (
    <PageContainer>
      <SectionWrapper title="Orders" description="Your orders, deliveries, returns, refunds, support and reviews.">
        <BuyerOrderCenter snapshot={result.snapshot} sampled={result.sampled} />
      </SectionWrapper>
    </PageContainer>
  );
}
