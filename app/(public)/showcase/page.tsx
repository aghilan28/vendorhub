import { ShowcaseMode } from "@/features/platform/components/showcase-mode";

export const metadata = {
  title: "Showcase",
  description: "A presentation-ready, story-driven walkthrough of KARTEX running a scenario end-to-end.",
};

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const params = await searchParams;
  return (
    <main id="main-content">
      <ShowcaseMode initialScenarioId={params?.scenario} />
    </main>
  );
}
