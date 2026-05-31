"use client";

// MCP-0A — Seller Media Center (Section MCP-0A.4)
// Upload, preview, validate, score quality, plan variants, and publish product
// media — plus a bulk-import manifest planner. Analysis runs client-side via the
// deterministic media engine; publishing uses the real upload server action.

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, ImageUp, Layers, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { cn } from "@/lib/utils";
import { detectFormat, planVariants, validateUpload } from "@/lib/media/processing";
import { qualityBand, scoreMediaQuality } from "@/lib/media/quality";
import { parseCsvManifest, planIngestion } from "@/lib/media/bulk";
import type { MediaFormat } from "@/lib/media/types";
import { uploadProductMediaAction } from "@/lib/media/actions";

type Candidate = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  format: MediaFormat;
  valid: boolean;
  errors: string[];
  quality: ReturnType<typeof scoreMediaQuality>;
  variants: number;
  status: "ready" | "uploading" | "done" | "error";
  message?: string;
};

function bandTone(band: string): "default" | "warning" | "danger" {
  if (band === "excellent" || band === "good") return "default";
  if (band === "fair") return "warning";
  return "danger";
}

function loadDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export function SellerMediaCenter() {
  const [productId, setProductId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manifest, setManifest] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = useMemo(() => candidates.reduce((s, c) => s + c.file.size, 0), [candidates]);
  const avgQuality = useMemo(
    () => (candidates.length ? Math.round(candidates.reduce((s, c) => s + c.quality.score, 0) / candidates.length) : 0),
    [candidates],
  );

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Candidate[] = [];
    for (const file of Array.from(files)) {
      const previewUrl = URL.createObjectURL(file);
      const { width, height } = await loadDimensions(previewUrl);
      const validation = validateUpload({ filename: file.name, mime: file.type, bytes: file.size }, "product-images");
      const meta = {
        width,
        height,
        bytes: file.size,
        format: detectFormat(file.type),
        aspectRatio: height ? width / height : 0,
      };
      const quality = scoreMediaQuality(meta);
      next.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        width,
        height,
        format: detectFormat(file.type),
        valid: validation.ok,
        errors: validation.errors,
        quality,
        variants: planVariants(Math.max(width, height)).length,
        status: "ready",
      });
    }
    setCandidates((prev) => [...prev, ...next]);
  };

  const remove = (id: string) => setCandidates((prev) => prev.filter((c) => c.id !== id));

  const publishOne = async (candidate: Candidate) => {
    if (!productId.trim()) return;
    setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, status: "uploading" } : c)));
    try {
      const fd = new FormData();
      fd.set("file", candidate.file);
      fd.set("productId", productId.trim());
      fd.set("altText", candidate.file.name.replace(/\.[^.]+$/, ""));
      const result = await uploadProductMediaAction(fd);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, status: "done", message: result.isPrimary ? "Primary" : "Added" } : c)),
      );
    } catch (error) {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id ? { ...c, status: "error", message: error instanceof Error ? error.message : "Upload failed" } : c,
        ),
      );
    }
  };

  const publishAll = async () => {
    for (const candidate of candidates.filter((c) => c.valid && c.status === "ready")) {
      await publishOne(candidate);
    }
  };

  const manifestPlan = useMemo(() => {
    if (!manifest.trim()) return null;
    const parsed = parseCsvManifest(manifest);
    return { parsed, plan: planIngestion(parsed.rows, 100) };
  }, [manifest]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Selected" value={String(candidates.length)} />
        <Stat label="Total size" value={`${(totalBytes / 1_000_000).toFixed(1)} MB`} />
        <Stat label="Avg quality" value={candidates.length ? `${avgQuality}/100` : "—"} />
        <Stat label="Valid" value={`${candidates.filter((c) => c.valid).length}/${candidates.length || 0}`} />
      </div>

      <GovernanceCard
        title="Upload product media"
        description="Drag images in or browse. Each image is validated and quality-scored before publishing."
        action={<ImageUp className="size-4 text-secondary-text" />}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="media-product-id" className="text-xs font-medium text-secondary-text">
              Target product ID
            </label>
            <Input
              id="media-product-id"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Paste the product UUID to publish into"
            />
          </div>
          <Button onClick={publishAll} disabled={!productId.trim() || candidates.every((c) => !c.valid || c.status !== "ready")}>
            <UploadCloud className="size-4" /> Publish all valid
          </Button>
        </div>

        <div
          className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-slate-50/60 p-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files);
          }}
        >
          <UploadCloud className="size-7 text-secondary-text" aria-hidden="true" />
          <p className="text-sm text-secondary-text">Drag & drop images here</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void addFiles(e.target.files)}
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <FileUp className="size-4" /> Browse files
          </Button>
        </div>

        {candidates.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {candidates.map((c) => {
              const band = qualityBand(c.quality.score);
              return (
                <li key={c.id} className="flex gap-3 rounded-lg border border-border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.previewUrl} alt={c.file.name} className="size-20 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary-text">{c.file.name}</p>
                    <p className="text-xs text-secondary-text">
                      {c.width}×{c.height} · {c.format} · {(c.file.size / 1_000_000).toFixed(2)} MB · {c.variants} variants
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={bandTone(band)}>Q {c.quality.score} · {band}</Badge>
                      {c.valid ? null : <Badge variant="danger">{c.errors.join(", ")}</Badge>}
                      {c.quality.flags.slice(0, 2).map((flag) => (
                        <Badge key={flag} variant="secondary">{flag}</Badge>
                      ))}
                      {c.status === "uploading" ? <Loader2 className="size-3.5 animate-spin text-secondary-text" /> : null}
                      {c.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> {c.message}
                        </span>
                      ) : null}
                      {c.status === "error" ? <span className="text-xs text-red-600">{c.message}</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label={`Remove ${c.file.name}`}
                    className="self-start rounded-md p-1 text-secondary-text hover:bg-slate-100 focus-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </GovernanceCard>

      <GovernanceCard
        title="Bulk import planner"
        description="Paste a CSV manifest (sku,name,images) to plan a large catalog media import. images is pipe-separated filenames."
        action={<Layers className="size-4 text-secondary-text" />}
      >
        <Textarea
          value={manifest}
          onChange={(e) => setManifest(e.target.value)}
          placeholder={"sku,name,images\nSKU-1,Rice 5kg,rice-front.jpg|rice-back.jpg\nSKU-2,Oil 1L,oil.jpg"}
          className="min-h-28 font-mono text-xs"
        />
        {manifestPlan ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Stat label="Rows" value={String(manifestPlan.plan.totalRows)} />
            <Stat label="Images" value={String(manifestPlan.plan.totalImages)} />
            <Stat label="Batches" value={String(manifestPlan.plan.batches.length)} />
            <Stat label="Errors" value={String(manifestPlan.parsed.errors.length)} />
          </div>
        ) : null}
        {manifestPlan && manifestPlan.parsed.errors.length > 0 ? (
          <ul className="mt-2 text-xs text-red-600">
            {manifestPlan.parsed.errors.slice(0, 5).map((e) => (
              <li key={`${e.line}-${e.message}`}>Line {e.line}: {e.message}</li>
            ))}
          </ul>
        ) : null}
      </GovernanceCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("operational-surface rounded-lg p-3")}>
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}
