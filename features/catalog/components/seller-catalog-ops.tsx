"use client";

// MCP-0B — Seller Catalog Operations: bulk validate/quality console + bulk
// price/inventory update planner (engine-validated before commit).

import { useMemo, useState } from "react";
import { ClipboardList, PackageCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { analyzeImport, parseCsv, qualityBand } from "@/lib/catalog";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="operational-surface rounded-lg p-3">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

const SAMPLE = `name,category,price,brand,sku,stock,images,attributes
Aashirvaad Atta 5kg,rice-grains,285,Aashirvaad,SKU-ATTA-5,120,https://images.unsplash.com/photo-1,weight=5000
Tata Salt 1kg,sugar-salt,28,Tata,SKU-SALT-1,300,https://images.unsplash.com/photo-2,weight=1000`;

interface PriceRow {
  sku: string;
  newPrice: number;
  newStock: number;
  valid: boolean;
}

function parsePricing(raw: string): PriceRow[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const [sku, price, stock] = line.split(",").map((c) => c.trim());
    const newPrice = Number(price);
    const newStock = Number(stock);
    return { sku, newPrice, newStock, valid: Boolean(sku) && newPrice >= 0 && Number.isInteger(newStock) && newStock >= 0 };
  });
}

export function SellerCatalogOps() {
  const [bulk, setBulk] = useState(SAMPLE);
  const [pricing, setPricing] = useState("sku,price,stock\nSKU-ATTA-5,279,140\nSKU-SALT-1,-5,300");

  const report = useMemo(() => {
    if (!bulk.trim()) return null;
    const parsed = parseCsv(bulk);
    if (parsed.errors.length) return { errors: parsed.errors, report: null };
    return { errors: [], report: analyzeImport(parsed.rows) };
  }, [bulk]);

  const priceRows = useMemo(() => parsePricing(pricing), [pricing]);
  const validPrice = priceRows.filter((r) => r.valid).length;

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Bulk product create / edit"
        description="Paste a CSV of products to validate against the taxonomy + attribute templates before committing."
        action={<ClipboardList className="size-4 text-secondary-text" />}
      >
        <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} className="min-h-28 font-mono text-xs" />
        {report?.errors.length ? <p className="mt-2 text-xs text-red-600">{report.errors.join(", ")}</p> : null}
        {report?.report ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Stat label="Rows" value={String(report.report.total)} />
              <Stat label="Publishable" value={String(report.report.valid + report.report.warnings)} />
              <Stat label="Blocked" value={String(report.report.invalid)} />
              <Stat label="Avg quality" value={`${report.report.averageQuality}/100`} />
            </div>
            <ul className="mt-3 space-y-1">
              {report.report.rows.map((row) => (
                <li key={row.ref} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-xs">
                  <span className="truncate text-primary-text">{row.ref}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={qualityBand(row.quality.score) === "poor" ? "danger" : "default"}>Q{row.quality.score}</Badge>
                    <Badge variant={row.status === "valid" ? "default" : row.status === "invalid" ? "danger" : "warning"}>{row.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={report.report.valid + report.report.warnings === 0}>
                <PackageCheck className="size-4" /> Commit {report.report.valid + report.report.warnings} products
              </Button>
            </div>
          </>
        ) : null}
      </GovernanceCard>

      <GovernanceCard
        title="Bulk price & inventory update"
        description="Paste sku,price,stock rows. Invalid rows (negative price / bad stock) are blocked."
        action={<TrendingUp className="size-4 text-secondary-text" />}
      >
        <Textarea value={pricing} onChange={(e) => setPricing(e.target.value)} className="min-h-24 font-mono text-xs" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-secondary-text">
            {validPrice}/{priceRows.length} rows valid
          </span>
          <Button size="sm" disabled={validPrice === 0}>
            Apply {validPrice} updates
          </Button>
        </div>
        {priceRows.some((r) => !r.valid) ? (
          <p className="mt-2 text-xs text-red-600">
            Blocked: {priceRows.filter((r) => !r.valid).map((r) => r.sku || "(no sku)").join(", ")}
          </p>
        ) : null}
      </GovernanceCard>
    </div>
  );
}
