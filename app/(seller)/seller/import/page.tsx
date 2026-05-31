import { PageContainer } from "@/components/layout/page-container";
import { ProductImportCenter } from "@/features/seller-activation/components/product-import-center";
import { SAMPLE_IMPORT_CSV } from "@/lib/seller-activation";

export const metadata = {
  title: "Product import",
  description: "Bulk-import products via CSV, validated against the catalog engine.",
};

export default function SellerImportPage() {
  return (
    <PageContainer>
      <ProductImportCenter sampleCsv={SAMPLE_IMPORT_CSV} sampled />
    </PageContainer>
  );
}
