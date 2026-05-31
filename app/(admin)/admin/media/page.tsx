import { PageContainer } from "@/components/layout/page-container";
import { AdminMediaCenter } from "@/features/media/components/admin-media-center";
import { getMediaGovernanceSnapshot, type MediaGovernanceSnapshot } from "@/lib/media/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media Governance",
  description: "Marketplace media analytics: coverage, storage, duplicates, broken media and recent uploads.",
};

export default async function AdminMediaPage() {
  let snapshot: MediaGovernanceSnapshot;
  try {
    snapshot = await getMediaGovernanceSnapshot();
  } catch {
    snapshot = {
      configured: false,
      analytics: {
        totalImages: 0,
        productsTotal: 0,
        productsWithImages: 0,
        productsWithoutImages: 0,
        coveragePercent: 0,
        primaryImages: 0,
        externalImages: 0,
        storedImages: 0,
        brokenReferences: 0,
        duplicatePaths: 0,
      },
      recent: [],
    };
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary-text">Media Governance</h1>
        <p className="text-sm text-secondary-text">
          Catalog media coverage, storage integrity, duplicate detection and recent uploads across the marketplace.
        </p>
      </div>
      <AdminMediaCenter snapshot={snapshot} />
    </PageContainer>
  );
}
