import { PageContainer } from "@/components/layout/page-container";
import { SellerCatalogOps } from "@/features/catalog/components/seller-catalog-ops";

export const metadata = {
  title: "Catalog Operations",
  description: "Bulk create/edit products and bulk price/inventory updates with validation and quality scoring.",
};

export default function SellerCatalogPage() {
  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary-text">Catalog Operations</h1>
        <p className="text-sm text-secondary-text">
          Validate and publish products in bulk, and run bulk price and inventory updates — every row checked against the
          marketplace taxonomy and attribute templates.
        </p>
      </div>
      <SellerCatalogOps />
    </PageContainer>
  );
}
