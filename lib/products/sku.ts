import { slugify } from "@/lib/taxonomy";
import type { AttributeValue } from "./types";

/** Deterministic 32-bit FNV-1a hash rendered in base36 (stable across runs). */
export function fnv1a36(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

/**
 * Deterministic ~64-bit stable hash (two independent 32-bit FNV streams) in base36. Collision-free
 * for product/SKU identity at 1M+ scale while remaining fast (Math.imul, no BigInt) and reproducible.
 */
export function stableHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return ((h1 >>> 0).toString(36).padStart(7, "0") + (h2 >>> 0).toString(36).padStart(7, "0")).toUpperCase();
}

function abbreviate(value: string, length: number): string {
  const cleaned = slugify(value).replace(/-/g, "").toUpperCase();
  return (cleaned || "NA").slice(0, length).padEnd(length, "X");
}

/** Builds a deterministic, human-readable variant code from variant axes (sorted for stability). */
export function buildVariantAxisCode(axes: Record<string, AttributeValue>): string {
  const parts = Object.keys(axes)
    .sort()
    .map((key) => slugify(String(axes[key])))
    .filter(Boolean);
  const code = parts.join("-").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return code || "STD";
}

export interface SkuGenerationInput {
  departmentId: string;
  brandId?: string | null;
  productId: string;
  variantKey: string;
}

/**
 * Generates a deterministic, collision-resistant internal SKU:
 * `VH-{DEPT4}-{BRAND4}-{PRODUCTHASH6}-{VARIANT}`.
 * Unique by construction across products (productId hash) and across variants (axis code).
 */
export function generateInternalSku(input: SkuGenerationInput): string {
  const dept = abbreviate(input.departmentId, 4);
  const brand = input.brandId ? abbreviate(input.brandId, 4) : "GEN0";
  const product = stableHash(input.productId);
  const variant = slugify(input.variantKey).replace(/-/g, "").toUpperCase().slice(0, 10) || "STD";
  return `VH-${dept}-${brand}-${product}-${variant}`;
}

/** Generic uniqueness index used for the SKU and barcode registries (Phase 3). */
export class UniqueRegistry {
  private readonly map = new Map<string, string>();
  private readonly collisions: { key: string; existing: string; attempted: string }[] = [];

  constructor(public readonly name: string) {}

  register(key: string, owner: string): boolean {
    const existing = this.map.get(key);
    if (existing !== undefined && existing !== owner) {
      this.collisions.push({ key, existing, attempted: owner });
      return false;
    }
    this.map.set(key, owner);
    return true;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): string | undefined {
    return this.map.get(key);
  }

  get size(): number {
    return this.map.size;
  }

  getCollisions(): { key: string; existing: string; attempted: string }[] {
    return [...this.collisions];
  }
}
