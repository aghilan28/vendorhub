import { PageContainer } from "@/components/layout/page-container";
import { FulfillmentCommandCenter } from "@/features/commerce-transaction/components/fulfillment-command-center";
import { getSellerFulfillmentSnapshot, type TransactionResult } from "@/lib/commerce-transaction/queries";
import { buildTransactionSnapshot, SAMPLE_TRANSACTION_INPUT } from "@/lib/commerce-transaction";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fulfillment Command Center",
  description: "Accept, pack, dispatch and track orders with live SLA and courier health.",
};

export default async function SellerFulfillmentPage() {
  let result: TransactionResult;
  try {
    result = await getSellerFulfillmentSnapshot();
  } catch {
    result = { configured: false, sampled: true, generatedAt: new Date().toISOString(), snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
  }
  return (
    <PageContainer className="space-y-6">
      <FulfillmentCommandCenter snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
