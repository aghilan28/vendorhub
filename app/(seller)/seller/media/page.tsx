import { PageContainer } from "@/components/layout/page-container";
import { SellerMediaCenter } from "@/features/media/components/seller-media-center";

export const metadata = {
  title: "Media Center",
  description: "Upload, validate, quality-score and publish product media; plan bulk catalog imports.",
};

export default function SellerMediaPage() {
  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary-text">Media Center</h1>
        <p className="text-sm text-secondary-text">
          Upload product images with automatic validation, quality scoring and variant planning. Plan large catalog
          imports with the bulk manifest planner.
        </p>
      </div>
      <SellerMediaCenter />
    </PageContainer>
  );
}
