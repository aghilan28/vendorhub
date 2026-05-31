"use client";

// MCP-0B — Admin Catalog Center: live catalog reality + ingestion console
// (validation, quality, duplicates) + catalog generation preview.

import { useMemo, useState } from "react";
import { Boxes, Database, FileSpreadsheet, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import {
  analyzeImport,
  catalogDistribution,
  generateCatalog,
  parseCsv,
  parseJson,
  qualityBand,
  rootCategories,
} from "@/lib/catalog";
import type { CatalogRealitySnapshot } from "@/lib/catalog/queries";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

const SAMPLE_CSV = `name,category,price,brand,sku,description,images,attributes
Samsung Galaxy M14 5G,smartphones,13999,Samsung,SKU-M14,Capable 5G phone,https://images.unsplash.com/photo-1,ram=6;storage=128;color=Blue
Bad Row,unknown-cat,0,,,,,`;

export function AdminCatalogCenter({ snapshot }: { snapshot: CatalogRealitySnapshot }) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [raw, setRaw] = useState(SAMPLE_CSV);
  const [genCount, setGenCount] = useState(1000);

  const report = useMemo(() => {
    if (!raw.trim()) return null;
    const parsed = format === "csv" ? parseCsv(raw) : parseJson(raw);
    if (parsed.errors.length) return { parseErrors: parsed.errors, report: null };
    return { parseErrors: [], report: analyzeImport(parsed.rows) };
  }, [raw, format]);

  const genPreview = useMemo(() => {
    const products = generateCatalog(Math.min(5000, Math.max(0, genCount)));
    return { products, dist: catalogDistribution(products) };
  }, [genCount]);

  return (
    <div className="space-y-6">
      <GovernanceCard title="Catalog reality" description="Live catalog counts vs taxonomy capacity." action={<Database className="size-4 text-secondary-text" />}>
        {!snapshot.configured ? (
          <p className="text-sm text-secondary-text">
            Supabase not configured — showing taxonomy capacity only. Live counts populate once connected and the catalog seed
            migration is applied.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Taxonomy roots" value={String(snapshot.taxonomy.roots)} />
          <Stat label="Taxonomy nodes" value={String(snapshot.taxonomy.total)} />
          <Stat label="Live products" value={String(snapshot.live.products)} />
          <Stat label="Active (searchable)" value={String(snapshot.live.activeProducts)} />
          <Stat label="Categories" value={String(snapshot.live.categories)} />
          <Stat label="Media coverage" value={`${snapshot.live.coveragePercent}%`} tone={snapshot.live.coveragePercent < 80 ? "warning" : undefined} />
        </div>
      </GovernanceCard>

      <GovernanceCard
        title="Product ingestion"
        description="Validate a CSV/JSON import: schema, taxonomy, attributes, duplicates and quality — before publishing."
        action={
          <div className="flex gap-1">
            <Button variant={format === "csv" ? "default" : "secondary"} size="sm" onClick={() => setFormat("csv")}>
              CSV
            </Button>
            <Button variant={format === "json" ? "default" : "secondary"} size="sm" onClick={() => setFormat("json")}>
              JSON
            </Button>
          </div>
        }
      >
        <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-32 font-mono text-xs" />
        {report?.parseErrors.length ? (
          <p className="mt-2 text-xs text-red-600">Parse errors: {report.parseErrors.join(", ")}</p>
        ) : null}
        {report?.report ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-5">
              <Stat label="Rows" value={String(report.report.total)} />
              <Stat label="Valid" value={String(report.report.valid)} />
              <Stat label="Invalid" value={String(report.report.invalid)} tone={report.report.invalid > 0 ? "danger" : undefined} />
              <Stat label="Duplicates" value={String(report.report.duplicates)} tone={report.report.duplicates > 0 ? "warning" : undefined} />
              <Stat label="Avg quality" value={`${report.report.averageQuality}/100`} />
            </div>
            <ul className="mt-3 space-y-1">
              {report.report.rows.slice(0, 12).map((row) => (
                <li key={row.ref} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-xs">
                  <span className="truncate text-primary-text">{row.ref}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={qualityBand(row.quality.score) === "poor" ? "danger" : qualityBand(row.quality.score) === "fair" ? "warning" : "default"}>
                      Q{row.quality.score}
                    </Badge>
                    <Badge variant={row.status === "valid" ? "default" : row.status === "invalid" ? "danger" : "warning"}>{row.status}</Badge>
                    {row.errors.length ? <span className="text-red-600">{row.errors.slice(0, 2).join(", ")}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </GovernanceCard>

      <GovernanceCard
        title="Catalog generation preview"
        description="Preview a deterministic catalog across the full taxonomy (the seed migration uses the same generator)."
        action={<Sparkles className="size-4 text-blue-500" />}
      >
        <div className="flex flex-wrap items-center gap-3">
          {[100, 1000, 5000].map((n) => (
            <Button key={n} size="sm" variant={genCount === n ? "default" : "secondary"} onClick={() => setGenCount(n)}>
              {n.toLocaleString()}
            </Button>
          ))}
          <span className="text-xs text-secondary-text">
            <Boxes className="mr-1 inline size-3" />
            {genPreview.products.length.toLocaleString()} products across {Object.keys(genPreview.dist).length} root categories ·
            avg quality {Math.round(genPreview.products.reduce((s, p) => s + p.qualityScore, 0) / Math.max(1, genPreview.products.length))}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rootCategories.slice(0, 28).map((root) => (
            <Badge key={root.slug} variant="secondary">
              {root.name}: {genPreview.dist[root.slug] ?? 0}
            </Badge>
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-secondary-text">
          <FileSpreadsheet className="size-3" /> Run <code className="rounded bg-slate-100 px-1">COUNT=100000 node scripts/generate-catalog-seed.mjs</code> to emit a 100k-product seed migration.
        </p>
      </GovernanceCard>
    </div>
  );
}
