import { describe, expect, it } from "vitest";
import {
  ALL_BUCKETS,
  analyzeIngest,
  applyModeration,
  autoModerate,
  buildProductGallery,
  buildPublicUrl,
  canModerate,
  computeProgress,
  computeRiskScore,
  detectFormat,
  findDuplicates,
  galleryUrls,
  hashContent,
  isAbsoluteUrl,
  isDuplicate,
  orderImages,
  orderQueue,
  parseCsvManifest,
  perceptualHash,
  planIngestion,
  planPipeline,
  planVariants,
  productImagePath,
  qualityBand,
  resumableRows,
  scoreMediaQuality,
  validateUpload,
  variantPath,
  type MediaMetadata,
} from "@/lib/media";

const META: MediaMetadata = { width: 2000, height: 2000, bytes: 800_000, format: "jpeg", aspectRatio: 1 };

describe("MCP-0A storage architecture", () => {
  it("provisions exactly ten buckets", () => {
    expect(ALL_BUCKETS).toHaveLength(10);
    expect(ALL_BUCKETS).toEqual(
      expect.arrayContaining(["product-images", "product-thumbnails", "product-webp", "temp-uploads", "moderation-review", "archive"]),
    );
  });

  it("passes through absolute URLs and builds paths deterministically", () => {
    expect(isAbsoluteUrl("https://images.unsplash.com/x.jpg")).toBe(true);
    expect(buildPublicUrl("product-images", "https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
    // No Supabase origin configured in tests → bare paths cannot resolve.
    expect(buildPublicUrl("product-images", "vendors/v/products/p/a.jpg")).toBeNull();
    expect(buildPublicUrl("product-images", null)).toBeNull();
  });

  it("computes object + variant paths", () => {
    const path = productImagePath({ vendorId: "v1", productId: "p1", assetId: "a1", ext: ".jpg" });
    expect(path).toBe("vendors/v1/products/p1/a1.jpg");
    expect(variantPath(path, "thumbnail", "webp")).toBe("vendors/v1/products/p1/a1__thumbnail.webp");
  });
});

describe("MCP-0A processing pipeline", () => {
  it("validates uploads against bucket policy", () => {
    expect(validateUpload({ filename: "x.jpg", mime: "image/jpeg", bytes: 1000 }, "product-images").ok).toBe(true);
    expect(validateUpload({ filename: "x.txt", mime: "text/plain", bytes: 1000 }, "product-images").errors).toContain("unsupported_mime");
    expect(validateUpload({ filename: "x.jpg", mime: "image/jpeg", bytes: 0 }, "product-images").errors).toContain("empty_file");
    expect(validateUpload({ filename: "x.jpg", mime: "image/jpeg", bytes: 99_000_000 }, "product-images").errors).toContain("file_too_large");
  });

  it("detects formats and never upscales variants", () => {
    expect(detectFormat("image/webp")).toBe("webp");
    const small = planVariants(300);
    expect(small.every((v) => v.targetLongEdge <= 300 || v.purpose === "thumbnail")).toBe(true);
    const large = planVariants(3000);
    expect(large.some((v) => v.purpose === "zoom")).toBe(true);
  });

  it("plans an audited pipeline and skips avif for tiny images", () => {
    const tiny = planPipeline({ kind: "image", originalLongEdge: 150 });
    expect(tiny.find((s) => s.step === "avif")?.status).toBe("skipped");
    const big = planPipeline({ kind: "image", originalLongEdge: 2000 });
    expect(big.find((s) => s.step === "avif")?.status).toBe("pending");
    expect(big.find((s) => s.step === "validate")).toBeTruthy();
  });

  it("hashes deterministically", () => {
    expect(hashContent("abc")).toBe(hashContent("abc"));
    expect(hashContent("abc")).not.toBe(hashContent("abd"));
    const p = perceptualHash({ width: 100, height: 100, bytes: 1000, sha256: "deadbeefcafe1234" });
    expect(p.startsWith("p_")).toBe(true);
  });
});

describe("MCP-0A quality engine", () => {
  it("scores within 0..100 and flags problems", () => {
    const good = scoreMediaQuality(META, { sharpness: 0.9, brightness: 0.5, noise: 0.05 });
    expect(good.score).toBeGreaterThanOrEqual(0);
    expect(good.score).toBeLessThanOrEqual(100);
    expect(good.score).toBeGreaterThan(70);

    const bad = scoreMediaQuality({ width: 300, height: 900, bytes: 5000, format: "jpeg", aspectRatio: 0.33 }, { sharpness: 0.2, noise: 0.8, brightness: 0.05 });
    expect(bad.flags).toContain("low_resolution");
    expect(bad.flags).toContain("blurry");
    expect(bad.score).toBeLessThan(good.score);
  });

  it("penalises duplicates and bands scores", () => {
    const unique = scoreMediaQuality(META);
    const dup = scoreMediaQuality(META, { duplicate: true });
    expect(dup.score).toBeLessThan(unique.score);
    expect(dup.flags).toContain("duplicate");
    expect(qualityBand(90)).toBe("excellent");
    expect(qualityBand(40)).toBe("poor");
  });
});

describe("MCP-0A moderation", () => {
  it("enforces the moderation state machine", () => {
    expect(canModerate("pending", "approved")).toBe(true);
    expect(canModerate("rejected", "approved")).toBe(false);
    expect(applyModeration("pending", "approved").ok).toBe(true);
    expect(applyModeration("rejected", "approved").ok).toBe(false);
  });

  it("scores risk and auto-routes", () => {
    const quality = scoreMediaQuality(META);
    const safe = autoModerate({ quality });
    expect(["approved", "pending"]).toContain(safe.state);

    const risky = computeRiskScore({ quality, analysis: { labels: [], unsafeScore: 0.9, dominantColors: [] } });
    expect(risky.risk).toBeGreaterThan(50);
    expect(risky.reasons).toContain("unsafe_content");

    const rejected = autoModerate({ quality, analysis: { labels: [], unsafeScore: 0.95, dominantColors: [] } });
    expect(rejected.state).toBe("rejected");
  });

  it("orders the moderation queue by priority then risk", () => {
    const ordered = orderQueue([
      { assetId: "a", riskScore: 10, state: "approved" },
      { assetId: "b", riskScore: 90, state: "flagged" },
      { assetId: "c", riskScore: 95, state: "escalated" },
    ]);
    expect(ordered[0].assetId).toBe("c");
    expect(ordered[1].assetId).toBe("b");
  });
});

describe("MCP-0A duplicate detection", () => {
  it("finds exact and near duplicates", () => {
    const assets = [
      { assetId: "1", sha256: "aaa", perceptual: "p_8_10_abcdef" },
      { assetId: "2", sha256: "aaa", perceptual: "p_8_10_abcdef" },
      { assetId: "3", sha256: "bbb", perceptual: "p_8_10_abcdeg" },
      { assetId: "4", sha256: "ccc", perceptual: "p_3_2_999999" },
    ];
    const matches = findDuplicates(assets);
    expect(matches.find((m) => m.assetId === "2")?.kind).toBe("exact");
    expect(matches.find((m) => m.assetId === "3")?.kind).toBe("near");
    expect(matches.find((m) => m.assetId === "4")).toBeUndefined();
    expect(isDuplicate(assets[1], [assets[0]])).toBe(true);
  });
});

describe("MCP-0A bulk ingestion", () => {
  it("parses CSV manifests and reports errors", () => {
    const ok = parseCsvManifest("sku,name,images\nS1,Rice,a.jpg|b.jpg\nS2,Oil,c.jpg");
    expect(ok.rows).toHaveLength(2);
    expect(ok.rows[0].images).toEqual(["a.jpg", "b.jpg"]);

    const missingCol = parseCsvManifest("sku,name\nS1,Rice");
    expect(missingCol.errors[0].message).toBe("missing_images_column");

    const noImages = parseCsvManifest("sku,name,images\nS1,Rice,");
    expect(noImages.errors.some((e) => e.message === "no_images")).toBe(true);
  });

  it("plans batches and tracks resumable progress", () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ ref: String(i), images: ["x.jpg"] }));
    const plan = planIngestion(rows, 100);
    expect(plan.batches).toHaveLength(3);
    expect(plan.totalImages).toBe(250);

    const states = ["done", "failed", "pending"] as const;
    const progress = computeProgress([...states]);
    expect(progress.total).toBe(3);
    expect(progress.failed).toBe(1);
    expect(resumableRows(rows.slice(0, 3), [...states])).toHaveLength(2);
  });
});

describe("MCP-0A product gallery", () => {
  it("returns an empty gallery rather than fabricating images", () => {
    const empty = buildProductGallery("p1", "Rice", []);
    expect(empty.items).toHaveLength(0);
  });

  it("orders primary first and resolves absolute URLs", () => {
    const ordered = orderImages([
      { storage_path: "b.jpg", sort_order: 1 },
      { storage_path: "a.jpg", sort_order: 0, is_primary: true },
    ]);
    expect(ordered[0].storage_path).toBe("a.jpg");

    const gallery = buildProductGallery("p1", "Rice", [
      { storage_path: "https://images.unsplash.com/1.jpg", is_primary: true },
      { storage_path: "https://images.unsplash.com/2.jpg" },
    ]);
    expect(gallery.items).toHaveLength(2);
    expect(gallery.items[0].isPrimary).toBe(true);
    expect(galleryUrls(gallery)).toContain("https://images.unsplash.com/1.jpg");
  });
});

describe("MCP-0A ingest analysis (integration)", () => {
  it("runs validate→quality→moderate→plan deterministically", () => {
    const result = analyzeIngest({
      candidate: { filename: "rice.jpg", mime: "image/jpeg", bytes: 800_000 },
      bucket: "product-images",
      metadata: META,
      signals: { sharpness: 0.85 },
      contentSurrogate: "rice-bytes",
    });
    expect(result.ok).toBe(true);
    expect(result.quality.score).toBeGreaterThan(0);
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.pipeline.length).toBeGreaterThan(5);
    expect(result.hashes.sha256).toBe(result.hashes.sha256);
    expect(analyzeIngest({
      candidate: { filename: "rice.jpg", mime: "image/jpeg", bytes: 800_000 },
      bucket: "product-images",
      metadata: META,
      signals: { sharpness: 0.85 },
      contentSurrogate: "rice-bytes",
    }).hashes.sha256).toBe(result.hashes.sha256);
  });
});
