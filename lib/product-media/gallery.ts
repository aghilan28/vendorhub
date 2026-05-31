import { makeImageAsset } from "./asset";
import type { GalleryRole, MediaAsset, MediaKind } from "./types";

interface GallerySlot {
  role: GalleryRole;
  kind: MediaKind;
  width: number;
  height: number;
}

/** The default gallery plan (Phase 6). Future video/360 slots are appended via addGallerySlot. */
export const DEFAULT_GALLERY_PLAN: GallerySlot[] = [
  { role: "PRIMARY", kind: "PRIMARY", width: 800, height: 800 },
  { role: "SECONDARY", kind: "GALLERY", width: 800, height: 800 },
  { role: "PACKAGING", kind: "PACKAGING", width: 800, height: 800 },
  { role: "BRAND", kind: "BRAND_ASSET", width: 600, height: 600 },
  { role: "LIFESTYLE", kind: "GALLERY", width: 1200, height: 800 },
];

export interface GalleryOptions {
  productName?: string;
  now: string;
  plan?: GallerySlot[];
}

/**
 * Gallery engine (Phase 6). Builds an ordered gallery (primary, secondary, packaging, brand,
 * lifestyle) for a product. Supports unlimited expansion via {@link addGallerySlot}.
 */
export function buildGallery(productId: string, options: GalleryOptions): MediaAsset[] {
  const plan = options.plan ?? DEFAULT_GALLERY_PLAN;
  const label = options.productName ?? productId;
  return plan.map((slot, index) =>
    makeImageAsset({
      productId,
      kind: slot.kind,
      role: slot.role,
      seed: `${productId}-${slot.role.toLowerCase()}`,
      width: slot.width,
      height: slot.height,
      alt: `${label} ${slot.role.toLowerCase()} image`,
      sortOrder: index,
      now: options.now,
    }),
  );
}

/** Appends a new gallery slot (e.g. a future VIDEO or VIEW_360 asset) — unlimited expansion. */
export function addGallerySlot(gallery: MediaAsset[], slot: GallerySlot, productId: string, now: string): MediaAsset[] {
  const asset = makeImageAsset({
    productId,
    kind: slot.kind,
    role: slot.role,
    seed: `${productId}-${slot.role.toLowerCase()}-${gallery.length}`,
    width: slot.width,
    height: slot.height,
    alt: `${productId} ${slot.role.toLowerCase()}`,
    sortOrder: gallery.length,
    now,
  });
  return [...gallery, asset];
}
