import { PageContainer } from "@/components/layout/page-container";
import { CommerceGovernanceCenter } from "@/features/commerce-transaction/components/commerce-governance-center";
import { getCommerceGovernanceSnapshot, type TransactionResult } from "@/lib/commerce-transaction/queries";
import { buildTransactionSnapshot, SAMPLE_TRANSACTION_INPUT } from "@/lib/commerce-transaction";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Commerce Governance Center",
  description: "Monitor orders, payments, refunds, deliveries, disputes and marketplace throughput.",
};

export default async function AdminCommercePage() {
  let result: TransactionResult;
  try {
    result = await getCommerceGovernanceSnapshot();
  } catch {
    result = { configured: false, sampled: true, generatedAt: new Date().toISOString(), snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
  }
  return (
    <PageContainer className="space-y-6">
      <CommerceGovernanceCenter snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
