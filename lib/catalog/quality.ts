// MCP-0B — Catalog Quality Engine (Section MCP-0B.7) — 0-100 per product.

import { validateAttributes } from "./attributes";
import { isKnownCategory } from "./taxonomy";
import type { CatalogProductInput, CatalogQuality } from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const BAD_TITLE = /(test|asdf|temp|untitled|product\s*\d*$|^.{1,3}$)/i;

/**
 * Scores a product's catalog quality 0-100 across title, description, category,
 * attributes, media, brand and SEO, returning flags + missing fields.
 */
export function scoreCatalogQuality(input: CatalogProductInput): CatalogQuality {
  const flags: string[] = [];
  const missingFields: string[] = [];
  let score = 100;

  // Title
  if (!input.name || input.name.trim().length < 4) {
    score -= 25;
    missingFields.push("name");
    flags.push("missing_or_short_title");
  } else if (BAD_TITLE.test(input.name.trim())) {
    score -= 15;
    flags.push("low_quality_title");
  } else if (input.name.length > 160) {
    score -= 5;
    flags.push("title_too_long");
  }

  // Description
  if (!input.description || input.description.trim().length < 20) {
    score -= 12;
    missingFields.push("description");
    flags.push("missing_description");
  }

  // Category
  if (!input.categorySlug) {
    score -= 20;
    missingFields.push("category");
    flags.push("missing_category");
  } else if (!isKnownCategory(input.categorySlug)) {
    score -= 18;
    flags.push("unknown_category");
  }

  // Price
  if (!(input.price > 0)) {
    score -= 15;
    missingFields.push("price");
    flags.push("invalid_price");
  }

  // Brand
  if (!input.brand) {
    score -= 6;
    missingFields.push("brand");
    flags.push("missing_brand");
  }

  // Media
  if (!input.imageUrls || input.imageUrls.length === 0) {
    score -= 15;
    missingFields.push("media");
    flags.push("missing_media");
  }

  // Attributes
  if (input.categorySlug && isKnownCategory(input.categorySlug)) {
    const attr = validateAttributes(input.categorySlug, input.attributes ?? {});
    if (!attr.ok) {
      score -= Math.min(20, attr.errors.length * 7);
      flags.push("incomplete_attributes");
      for (const e of attr.errors) {
        const key = e.split(":")[1];
        if (key) missingFields.push(`attribute:${key}`);
      }
    }
    if (attr.warnings.length) flags.push("attribute_warnings");
  }

  return { score: clampScore(score), flags, missingFields };
}

export function qualityBand(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}
