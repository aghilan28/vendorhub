// MCP-1C — Live hyperlocal data access.
//
// Reads REAL vendors (coordinates/radius) when Supabase is configured and feeds
// the deterministic engine. Honest degradation: unconfigured / no-activity /
// auth failure → clearly-labelled sample (sampled: true).

import { requireRole, requireUser } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAdminLocationSnapshot, buildSellerHyperlocalSnapshot } from "./index";
import { SAMPLE_BUYER, SAMPLE_STORES } from "./sample";
import type { AdminLocationSnapshot, SellerHyperlocalSnapshot, StoreLocation } from "./types";

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

function mapVendor(row: Record<string, unknown>): StoreLocation | null {
  const latitude = num(row, "latitude", NaN);
  const longitude = num(row, "longitude", NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    storeId: str(row, "id"),
    name: str(row, "name", "Store"),
    coordinates: { latitude, longitude },
    serviceRadiusKm: num(row, "service_radius_km", 8),
    fulfillmentPromiseMinutes: num(row, "fulfillment_promise_minutes", 30),
    city: str(row, "city") || undefined,
    rating: num(row, "rating", 0) || undefined,
    inStock: true,
  };
}

export interface AdminLocationResult {
  configured: boolean;
  sampled: boolean;
  snapshot: AdminLocationSnapshot;
}

export async function getAdminLocationSnapshot(): Promise<AdminLocationResult> {
  if (!isConfigured()) return { configured: false, sampled: true, snapshot: buildAdminLocationSnapshot(SAMPLE_STORES) };
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("vendors")
      .select("id, name, latitude, longitude, service_radius_km, fulfillment_promise_minutes, city, rating")
      .is("deleted_at", null)
      .limit(1000);
    const stores = ((data ?? []) as unknown as Record<string, unknown>[]).map(mapVendor).filter((s): s is StoreLocation => s !== null);
    if (stores.length === 0) return { configured: true, sampled: true, snapshot: buildAdminLocationSnapshot(SAMPLE_STORES) };
    // network + intelligence still use the deterministic zone/coverage model
    return { configured: true, sampled: false, snapshot: buildAdminLocationSnapshot(stores) };
  } catch {
    return { configured: true, sampled: true, snapshot: buildAdminLocationSnapshot(SAMPLE_STORES) };
  }
}

export interface SellerHyperlocalResult {
  configured: boolean;
  sampled: boolean;
  snapshot: SellerHyperlocalSnapshot;
}

export async function getSellerHyperlocalSnapshot(): Promise<SellerHyperlocalResult> {
  if (!isConfigured()) return { configured: false, sampled: true, snapshot: buildSellerHyperlocalSnapshot(SAMPLE_STORES[0], undefined, [SAMPLE_BUYER]) };
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data: membership } = await supabase
      .from("vendor_members")
      .select("vendor:vendors(id, name, latitude, longitude, service_radius_km, fulfillment_promise_minutes, city, rating)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const vendorRaw = rec(membership).vendor;
    const vendor = rec(Array.isArray(vendorRaw) ? (vendorRaw as unknown[])[0] : vendorRaw);
    const store = mapVendor(vendor);
    if (!store) return { configured: true, sampled: true, snapshot: buildSellerHyperlocalSnapshot(SAMPLE_STORES[0], undefined, [SAMPLE_BUYER]) };
    return { configured: true, sampled: false, snapshot: buildSellerHyperlocalSnapshot(store, undefined, [SAMPLE_BUYER]) };
  } catch {
    return { configured: true, sampled: true, snapshot: buildSellerHyperlocalSnapshot(SAMPLE_STORES[0], undefined, [SAMPLE_BUYER]) };
  }
}
