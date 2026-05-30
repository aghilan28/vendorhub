import { PageContainer } from "@/components/layout/page-container";
import { PlatformDocs } from "@/features/platform/components/platform-docs";

export const metadata = {
  title: "Platform Documentation",
  description:
    "KARTEX documentation hub: platform, architecture, capability, user, demo, judge, investor and faculty guides.",
};

export default function PlatformDocsPage() {
  return (
    <PageContainer>
      <PlatformDocs />
    </PageContainer>
  );
}
