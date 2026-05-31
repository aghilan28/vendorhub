import { PageLoader } from "@/components/feedback/page-loader";
import { PageContainer } from "@/components/layout/page-container";

export default function AdminLoading() {
  return (
    <PageContainer>
      <PageLoader />
    </PageContainer>
  );
}
