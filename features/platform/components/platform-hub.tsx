"use client";

// KARTEX Phase N — Platform hub (/platform)
// One navigable surface that lets anyone understand, explore and navigate the
// whole platform: map, storyboard, value, scenarios, use cases, tours, docs.

import Link from "next/link";
import { ArrowRight, Compass, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformModel } from "@/lib/platform";
import { PlatformMap } from "./platform-map";
import { IntelligenceStoryboard } from "./intelligence-storyboard";
import { ValueExplanation } from "./value-explanation";
import { BusinessValueDashboard } from "./business-value-dashboard";
import { DemoScenarioCenter } from "./demo-scenario-center";
import { UseCaseLibrary } from "./use-case-library";
import { PlatformTour } from "./platform-tour";
import { DocumentationHub } from "./documentation-hub";
import { PlatformSearch } from "./platform-search";

const AUDIENCES = ["Judges", "Investors", "Faculty", "Mentors", "Customers"];

const TABS = [
  { value: "map", label: "Platform Map" },
  { value: "storyboard", label: "Storyboard" },
  { value: "subsystems", label: "Value Explanation" },
  { value: "scenarios", label: "Demo Scenarios" },
  { value: "usecases", label: "Use Cases" },
  { value: "value", label: "Business Value" },
  { value: "tour", label: "Guided Tours" },
  { value: "search", label: "Search" },
  { value: "docs", label: "Documentation" },
] as const;

export function PlatformHub() {
  const { subsystems, scenarios, useCases } = getPlatformModel();

  return (
    <div className="space-y-6">
      <section className="polished-surface overflow-hidden">
        <div className="relative p-6 sm:p-8">
          <Badge variant="ai">
            <Compass className="size-3" /> Platform realization
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary-text sm:text-4xl">
            KARTEX — from raw signal to measured outcome
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary-text sm:text-base">
            KARTEX is a closed-loop decision platform. It turns signals into research, research into knowledge,
            knowledge into simulated foresight, foresight into trusted and governed decisions, and decisions into
            measured execution — eight subsystems working as one.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-secondary-text">Built to be understood by</span>
            {AUDIENCES.map((audience) => (
              <span key={audience} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-secondary-text">
                {audience}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/showcase">
                <Play className="size-4" /> Enter Showcase Mode
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/admin/execution">
                Open Execution OS <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Subsystems" value={String(subsystems.length)} />
            <Stat label="Intelligence stages" value="6" />
            <Stat label="Demo scenarios" value={String(scenarios.length)} />
            <Stat label="Use cases" value={String(useCases.length)} />
          </div>
        </div>
      </section>

      <Tabs defaultValue="map">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="map">
          <PlatformMap />
        </TabsContent>
        <TabsContent value="storyboard">
          <div className="mx-auto max-w-2xl">
            <IntelligenceStoryboard />
          </div>
        </TabsContent>
        <TabsContent value="subsystems">
          <ValueExplanation />
        </TabsContent>
        <TabsContent value="scenarios">
          <DemoScenarioCenter />
        </TabsContent>
        <TabsContent value="usecases">
          <UseCaseLibrary />
        </TabsContent>
        <TabsContent value="value">
          <BusinessValueDashboard />
        </TabsContent>
        <TabsContent value="tour">
          <PlatformTour />
        </TabsContent>
        <TabsContent value="search">
          <PlatformSearch />
        </TabsContent>
        <TabsContent value="docs">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-secondary-text">
                Quick reference below, or open the full documentation hub with audience guides.
              </p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/platform/docs">
                  Open full documentation <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <DocumentationHub />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center shadow-sm">
      <p className="text-2xl font-semibold text-primary-text">{value}</p>
      <p className="text-xs text-secondary-text">{label}</p>
    </div>
  );
}
