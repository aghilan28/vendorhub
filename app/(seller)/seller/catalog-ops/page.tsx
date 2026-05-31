import { PageContainer } from "@/components/layout/page-container";
import { SellerCatalogOperations } from "@/features/catalog-population/components/seller-catalog-operations";
import { getSellerCatalogSnapshot, type SellerCatalogResult } from "@/lib/catalog-population/queries";
import { buildSellerCatalogSnapshot, SAMPLE_PRODUCTS_WITH_GAPS } from "@/lib/catalog-population";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catalog Operations",
  description: "Catalog, import and media health with catalog recommendations.",
};

export default async function SellerCatalogOpsPage() {
  let result: SellerCatalogResult;
  try {
    result = await getSellerCatalogSnapshot();
  } catch {
    result = { configured: false, sampled: true, snapshot: buildSellerCatalogSnapshot({ sellerId: "preview", products: SAMPLE_PRODUCTS_WITH_GAPS }) };
  }
  return (
    <PageContainer>
      <SellerCatalogOperations snapshot={result.snapshot} sampled={result.sampled} />
    </PageContainer>
  );
}
