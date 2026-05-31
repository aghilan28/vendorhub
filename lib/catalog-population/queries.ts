// MCP-1B — Live catalog-population data access.
//
// Reads REAL products (+ category) when Supabase is configured and feeds the
// deterministic engine. Honest degradation: unconfigured / no-activity / auth
// failure → clearly-labelled sample (sampled: true).

import { requireRole, requireUser } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CatalogProductInput } from "@/lib/catalog";
import { buildCatalogGovernanceSnapshot, type GovernanceProductInput } from "./governance";
import { buildPopulationIntelligence, type PopulationProductInput } from "./intelligence";
import { buildSellerCatalogSnapshot } from "./catalog-ops";
import {
  SAMPLE_GOVERNANCE_PRODUCTS,
  SAMPLE_POPULATION_PRODUCTS,
  SAMPLE_PRODUCTS_WITH_GAPS,
} from "./sample";
import type { CatalogGovernanceSnapshot, PopulationIntelligence, SellerCatalogSnapshot } from "./types";

function isConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(source: Record<string, unknown>, key: string, fallback = ""): string {
  const v = source[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}
function num(source: Record<string, unknown>, key: string, fallback = 0): number {
  const v = source[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;
}

function mapProduct(row: Record<string, unknown>): CatalogProductInput & { status?: "active" | "pending" | "draft"; sellerId?: string; hasVariants?: boolean } {
  const category = rec(Array.isArray(row.category) ? (row.category as unknown[])[0] : row.category);
  const images = Array.isArray(row.product_images) ? (row.product_images as unknown[]) : [];
  const variants = Array.isArray(row.product_variants) ? (row.product_variants as unknown[]) : [];
  const status = str(row, "status", "ACTIVE").toUpperCase();
  return {
    externalId: str(row, "id"),
    name: str(row, "name", "Product"),
    categorySlug: str(category, "slug", str(row, "category_slug", "")),
    brand: str(row, "brand") || undefined,
    sku: str(row, "sku") || undefined,
    price: num(row, "base_price", num(row, "price")),
    stock: num(row, "stock"),
    attributes: rec(row.attributes) as Record<string, string | number | boolean>,
    imageUrls: images.length ? images.map((i) => str(rec(i), "storage_path", str(rec(i), "url"))).filter(Boolean) : [],
    status: status === "PENDING" ? "pending" : status === "DRAFT" ? "draft" : "active",
    sellerId: str(row, "vendor_id") || undefined,
    hasVariants: variants.length > 0,
  };
}

async function readProducts(limit = 2000, vendorId?: string): Promise<ReturnType<typeof mapProduct>[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("id, name, sku, brand, base_price, status, attributes, vendor_id, category:categories(slug), product_images(storage_path), product_variants(id)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (vendorId) query = query.eq("vendor_id", vendorId);
  const { data } = await query;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapProduct);
}

// ── Admin: catalog governance + population intelligence ──────────────────────

export interface CatalogAdminResult {
  configured: boolean;
  sampled: boolean;
  governance: CatalogGovernanceSnapshot;
  intelligence: PopulationIntelligence;
}

function sampleAdminResult(configured: boolean): CatalogAdminResult {
  return {
    configured,
    sampled: true,
    governance: buildCatalogGovernanceSnapshot(SAMPLE_GOVERNANCE_PRODUCTS),
    intelligence: buildPopulationIntelligence(SAMPLE_POPULATION_PRODUCTS),
  };
}

export async function getCatalogGovernanceSnapshot(): Promise<CatalogAdminResult> {
  if (!isConfigured()) return sampleAdminResult(false);
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const products = await readProducts(2000);
    if (products.length === 0) return sampleAdminResult(true);
    return {
      configured: true,
      sampled: false,
      governance: buildCatalogGovernanceSnapshot(products as GovernanceProductInput[]),
      intelligence: buildPopulationIntelligence(products as PopulationProductInput[]),
    };
  } catch {
    return sampleAdminResult(true);
  }
}

// ── Seller: catalog operations ────────────────────────────────────────────────

export interface SellerCatalogResult {
  configured: boolean;
  sampled: boolean;
  snapshot: SellerCatalogSnapshot;
}

function sampleSellerResult(configured: boolean): SellerCatalogResult {
  return { configured, sampled: true, snapshot: buildSellerCatalogSnapshot({ sellerId: "preview", products: SAMPLE_PRODUCTS_WITH_GAPS }) };
}

export async function getSellerCatalogSnapshot(): Promise<SellerCatalogResult> {
  if (!isConfigured()) return sampleSellerResult(false);
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data: membership } = await supabase
      .from("vendor_members")
      .select("vendor_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const vendorId = str(rec(membership), "vendor_id");
    if (!vendorId) return sampleSellerResult(true);

    const products = await readProducts(2000, vendorId);
    if (products.length === 0) return sampleSellerResult(true);
    const published = products.filter((p) => p.status === "active").length;
    return {
      configured: true,
      sampled: false,
      snapshot: buildSellerCatalogSnapshot({ sellerId: vendorId, products, publishedProducts: published }),
    };
  } catch {
    return sampleSellerResult(true);
  }
}
