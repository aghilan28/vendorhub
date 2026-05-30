import { PageContainer } from "@/components/layout/page-container";
import { PlatformHub } from "@/features/platform/components/platform-hub";

export const metadata = {
  title: "Platform",
  description:
    "Understand KARTEX in minutes: platform map, intelligence storyboard, value explanations, demo scenarios, use cases, business value and guided tours.",
};

export default function PlatformPage() {
  return (
    <PageContainer className="space-y-6">
      <PlatformHub />
    </PageContainer>
  );
}
