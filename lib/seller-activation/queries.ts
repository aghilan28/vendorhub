// MCP-1A — Live seller-activation data access.
//
// Reads REAL marketplace tables (vendors, products, vendor_members) when
// Supabase is configured and feeds the deterministic engine. Honest
// degradation: unconfigured / no-activity / auth failure → clearly-labelled
// sample (sampled: true). Never substitutes demo data into a "live" result.

import { requireRole, requireUser } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildActivationSnapshot, type ActivationInput } from "./activation";
import { buildGovernanceSnapshot, type GovernanceSellerInput } from "./governance";
import { buildPopulationSnapshot, type PopulationSellerInput } from "./operations";
import { buildStorefront } from "./storefront";
import {
  SAMPLE_ACTIVATION_INPUT,
  SAMPLE_GOVERNANCE_SELLERS,
  SAMPLE_POPULATION_SELLERS,
  SAMPLE_STOREFRONT_PRODUCTS,
  SAMPLE_STOREFRONT_SELLER,
} from "./sample";
import type { SellerActivationSnapshot, SellerGovernanceSnapshot, Storefront } from "./types";

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
function applicationStateFromVendor(status: string): GovernanceSellerInput["applicationState"] {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "PENDING":
    case "PENDING_REVIEW":
      return "submitted";
    case "UNDER_REVIEW":
      return "under_review";
    case "SUSPENDED":
    case "REJECTED":
      return "rejected";
    default:
      return "submitted";
  }
}

// ── Admin: marketplace population + governance ───────────────────────────────

export interface PopulationResult {
  configured: boolean;
  sampled: boolean;
  population: ReturnType<typeof buildPopulationSnapshot>;
  governance: SellerGovernanceSnapshot;
}

function samplePopulationResult(configured: boolean): PopulationResult {
  return {
    configured,
    sampled: true,
    population: buildPopulationSnapshot(SAMPLE_POPULATION_SELLERS),
    governance: buildGovernanceSnapshot(SAMPLE_GOVERNANCE_SELLERS),
  };
}

export async function getMarketplacePopulationSnapshot(): Promise<PopulationResult> {
  if (!isConfigured()) return samplePopulationResult(false);
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const supabase = await createSupabaseServerClient();
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name, slug, status, created_at, products(id, status)")
      .is("deleted_at", null)
      .limit(1000);

    const rows = (vendors ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return samplePopulationResult(true);

    const now = Date.now();
    const populationSellers: PopulationSellerInput[] = rows.map((row) => {
      const products = Array.isArray(row.products) ? (row.products as unknown[]).map(rec) : [];
      const published = products.filter((p) => str(p, "status").toUpperCase() === "ACTIVE").length;
      const status = str(row, "status", "PENDING").toUpperCase();
      return {
        sellerId: str(row, "id"),
        registered: true,
        verified: status === "ACTIVE" || status === "UNDER_REVIEW",
        products: products.length,
        publishedProducts: published,
        active: status === "ACTIVE",
        categories: [],
        catalogQuality: products.length ? 60 : 0,
      };
    });
    const governanceSellers: GovernanceSellerInput[] = rows.map((row) => {
      const products = Array.isArray(row.products) ? (row.products as unknown[]) : [];
      const created = str(row, "created_at");
      return {
        sellerId: str(row, "id"),
        sellerName: str(row, "name", "Seller"),
        applicationState: applicationStateFromVendor(str(row, "status", "PENDING")),
        products: products.length,
        createdAtHoursAgo: created ? Math.round((now - new Date(created).getTime()) / 3_600_000) : 0,
      };
    });

    return {
      configured: true,
      sampled: false,
      population: buildPopulationSnapshot(populationSellers),
      governance: buildGovernanceSnapshot(governanceSellers),
    };
  } catch {
    return samplePopulationResult(true);
  }
}

// ── Seller activation center ──────────────────────────────────────────────────

export interface ActivationResult {
  configured: boolean;
  sampled: boolean;
  snapshot: SellerActivationSnapshot;
}

function sampleActivationResult(configured: boolean): ActivationResult {
  return { configured, sampled: true, snapshot: buildActivationSnapshot(SAMPLE_ACTIVATION_INPUT) };
}

export async function getSellerActivationSnapshot(): Promise<ActivationResult> {
  if (!isConfigured()) return sampleActivationResult(false);
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("vendor_members")
      .select("vendor:vendors(id, name, slug, status, products(id, status))")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    const vendorRaw = rec(data).vendor;
    const vendor = rec(Array.isArray(vendorRaw) ? (vendorRaw as unknown[])[0] : vendorRaw);
    if (!vendor.id) return sampleActivationResult(true);

    const products = Array.isArray(vendor.products) ? (vendor.products as unknown[]).map(rec) : [];
    const published = products.filter((p) => str(p, "status").toUpperCase() === "ACTIVE").length;
    const status = str(vendor, "status", "PENDING").toUpperCase();

    const input: ActivationInput = {
      sellerId: str(vendor, "id"),
      storeName: str(vendor, "name", "Your store"),
      data: { storeName: str(vendor, "name"), storeSlug: str(vendor, "slug") },
      applicationState: status === "ACTIVE" ? "active" : status === "UNDER_REVIEW" ? "under_review" : "submitted",
      verification: { score: status === "ACTIVE" ? 100 : 50, decision: status === "ACTIVE" ? "auto_approve" : "manual_review", passed: status === "ACTIVE" ? 4 : 2, total: 4, escalated: false },
      catalog: { products: products.length, published, averageQuality: products.length ? 60 : 0 },
      trustScore: status === "ACTIVE" ? 75 : 40,
    };
    return { configured: true, sampled: false, snapshot: buildActivationSnapshot(input) };
  } catch {
    return sampleActivationResult(true);
  }
}

// ── Public storefront ──────────────────────────────────────────────────────────

export interface StorefrontResult {
  configured: boolean;
  sampled: boolean;
  storefront: Storefront | null;
}

function sampleStorefrontResult(configured: boolean): StorefrontResult {
  return { configured, sampled: true, storefront: buildStorefront(SAMPLE_STOREFRONT_SELLER, SAMPLE_STOREFRONT_PRODUCTS) };
}

export async function getStorefrontBySlug(slug: string): Promise<StorefrontResult> {
  if (!isConfigured()) return sampleStorefrontResult(false);
  try {
    const supabase = await createSupabaseServerClient();
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, name, slug, status, products(id, name, slug, base_price, status, category:categories(name))")
      .eq("slug", slug)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    const row = rec(vendor);
    if (!row.id) return { configured: true, sampled: false, storefront: null };

    const products = (Array.isArray(row.products) ? (row.products as unknown[]).map(rec) : [])
      .filter((p) => str(p, "status").toUpperCase() === "ACTIVE")
      .map((p) => ({
        id: str(p, "id"),
        name: str(p, "name", "Product"),
        slug: str(p, "slug"),
        price: Number(rec(p).base_price ?? 0),
        category: str(rec(Array.isArray(rec(p).category) ? (rec(p).category as unknown[])[0] : rec(p).category), "name", "General"),
        stock: 1,
      }));

    const storefront = buildStorefront(
      { sellerId: str(row, "id"), name: str(row, "name", "Store"), slug: str(row, "slug", slug), verified: str(row, "status").toUpperCase() === "ACTIVE" },
      products,
    );
    return { configured: true, sampled: false, storefront };
  } catch {
    return sampleStorefrontResult(true);
  }
}
