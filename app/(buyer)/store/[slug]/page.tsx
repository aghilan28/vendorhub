import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { StorefrontView } from "@/features/seller-activation/components/storefront-view";
import { getStorefrontBySlug, type StorefrontResult } from "@/lib/seller-activation/queries";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let result: StorefrontResult;
  try {
    result = await getStorefrontBySlug(slug);
  } catch {
    result = { configured: false, sampled: false, storefront: null };
  }
  if (!result.storefront) notFound();
  return (
    <PageContainer>
      <StorefrontView store={result.storefront} sampled={result.sampled} />
    </PageContainer>
  );
}
