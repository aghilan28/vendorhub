import { PageContainer } from "@/components/layout/page-container";
import { AdminTrustCenter } from "@/features/trust-os/components/admin-trust-center";
import { getTrustGovernanceCounts, type TrustGovernanceCounts } from "@/lib/trust/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trust Governance",
  description: "Marketplace trust, reputation, returns/refunds, disputes, support and trust intelligence.",
};

export default async function AdminTrustPage() {
  let counts: TrustGovernanceCounts;
  try {
    counts = await getTrustGovernanceCounts();
  } catch {
    counts = { configured: false, reviews: 0, flaggedReviews: 0, openDisputes: 0, openRefunds: 0, trustedSellers: 0 };
  }
  return (
    <PageContainer className="space-y-6">
      <AdminTrustCenter counts={counts} />
    </PageContainer>
  );
}
