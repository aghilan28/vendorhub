// MCP-0A — Admin Media Governance (Section MCP-0A.11)
// Server-rendered media governance: coverage, storage, duplicate and broken-media
// analytics computed from real data, with an honest empty state.

import { AlertTriangle, ImageOff, Images, Layers, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { EmptyState } from "@/components/feedback/empty-state";
import type { MediaGovernanceSnapshot } from "@/lib/media/queries";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function AdminMediaCenter({ snapshot }: { snapshot: MediaGovernanceSnapshot }) {
  const a = snapshot.analytics;

  if (!snapshot.configured) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Media backend not configured"
        description="Connect Supabase (storage + database) to populate live media governance analytics. The media pipeline, quality engine and moderation models are ready and will activate automatically once configured."
      />
    );
  }

  if (a.totalImages === 0) {
    return (
      <EmptyState
        icon={Images}
        title="No product media yet"
        description="No images have been published. Sellers can upload media in the Seller Media Center; analytics will populate here as media is added."
      />
    );
  }

  return (
    <div className="space-y-6">
      <GovernanceCard title="Catalog media coverage" description="How much of the catalog has imagery." action={<ShieldCheck className="size-4 text-secondary-text" />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total images" value={String(a.totalImages)} />
          <Stat label="Coverage" value={`${a.coveragePercent}%`} tone={a.coveragePercent < 80 ? "warning" : undefined} />
          <Stat label="Products with media" value={String(a.productsWithImages)} />
          <Stat label="Products without media" value={String(a.productsWithoutImages)} tone={a.productsWithoutImages > 0 ? "warning" : undefined} />
        </div>
      </GovernanceCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GovernanceCard title="Storage & integrity" description="Where media lives and reference health." action={<Layers className="size-4 text-secondary-text" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Stored (Supabase)" value={String(a.storedImages)} />
            <Stat label="External URLs" value={String(a.externalImages)} />
            <Stat label="Primary images" value={String(a.primaryImages)} />
            <Stat label="Broken references" value={String(a.brokenReferences)} tone={a.brokenReferences > 0 ? "danger" : undefined} />
          </div>
        </GovernanceCard>

        <GovernanceCard title="Duplicate detection" description="Repeated storage paths across the catalog." action={<AlertTriangle className="size-4 text-amber-500" />}>
          <Stat label="Duplicate paths" value={String(a.duplicatePaths)} tone={a.duplicatePaths > 0 ? "warning" : undefined} />
          <p className="mt-3 text-xs text-secondary-text">
            Perceptual (near-duplicate) and AI safety scoring populate once the media worker writes hashes and analysis
            to the media tables provisioned by this phase.
          </p>
        </GovernanceCard>
      </div>

      <GovernanceCard title="Recent media" description="Most recently published product images.">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {snapshot.recent.map((asset) => (
            <li key={asset.id} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
              {asset.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.productName} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-secondary-text">
                  <ImageOff className="size-5" />
                </div>
              )}
              {asset.isPrimary ? (
                <Badge variant="default" className="absolute left-1 top-1 text-[10px]">
                  primary
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </GovernanceCard>
    </div>
  );
}
