import { PageContainer } from "@/components/layout/page-container";
import { SecisChangeDetail } from "@/features/secis/components/detail-screen";

export const metadata = { title: "Change event detail" };

export default async function SecisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <SecisChangeDetail eventId={id} />
    </PageContainer>
  );
}
