import { PageContainer } from "@/components/layout/page-container";
import { SellerActivationCenter } from "@/features/seller-activation/components/seller-activation-center";
import { getSellerActivationSnapshot, type ActivationResult } from "@/lib/seller-activation/queries";
import { buildActivationSnapshot, SAMPLE_ACTIVATION_INPUT } from "@/lib/seller-activation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activation Center",
  description: "Onboarding, verification, catalog and trust status with next-best actions.",
};

export default async function SellerActivationPage() {
  let result: ActivationResult;
  try {
    result = await getSellerActivationSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildActivationSnapshot(SAMPLE_ACTIVATION_INPUT) };
  }
  return (
    <PageContainer>
      <SellerActivationCenter snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
