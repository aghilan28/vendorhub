import { PageContainer } from "@/components/layout/page-container";
import { AdminCatalogCenter } from "@/features/catalog/components/admin-catalog-center";
import { getCatalogRealitySnapshot, type CatalogRealitySnapshot } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catalog Activation",
  description: "Catalog reality, product ingestion, quality, duplicate detection and catalog generation.",
};

export default async function AdminCatalogPage() {
  let snapshot: CatalogRealitySnapshot;
  try {
    snapshot = await getCatalogRealitySnapshot();
  } catch {
    const { rootCategories, taxonomyNodes } = await import("@/lib/catalog/taxonomy");
    snapshot = {
      configured: false,
      taxonomy: { roots: rootCategories.length, total: taxonomyNodes.length },
      live: { products: 0, activeProducts: 0, categories: 0, productsWithImages: 0, inventoryRows: 0, coveragePercent: 0 },
    };
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary-text">Catalog Activation</h1>
        <p className="text-sm text-secondary-text">
          Ingest, validate, deduplicate and quality-score products at scale; monitor live catalog reality against taxonomy
          capacity.
        </p>
      </div>
      <AdminCatalogCenter snapshot={snapshot} />
    </PageContainer>
  );
}
