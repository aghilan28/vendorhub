// MCP-1A — Deterministic sample marketplace-activation data (PREVIEW ONLY).
//
// Renders surfaces before sign-in / without Supabase. Always labelled
// "Preview (sample data)"; never drives a "live" count (queries.ts sets
// sampled: true). Fixed timestamps keep it deterministic for tests.

import type { GovernanceSellerInput } from "./governance";
import type { PopulationSellerInput } from "./operations";
import type { ActivationInput } from "./activation";
import { buildVerificationCase } from "./verification";
import { createApplication } from "./onboarding";
import type { SellerApplication, SellerApplicationData } from "./types";
import type { StorefrontProductInput, StorefrontSellerInput } from "./storefront";

const AT = "2026-05-31T06:00:00.000Z";

// A fully-completed application (ready to submit / active).
export const SAMPLE_COMPLETE_DATA: SellerApplicationData = {
  ownerName: "Asha Rao",
  email: "asha@freshlocal.example",
  phone: "+91 90000 11111",
  emailVerified: true,
  phoneVerified: true,
  storeName: "FreshLocal Mart",
  storeSlug: "freshlocal-mart",
  category: "groceries-staples",
  businessName: "FreshLocal Retail",
  businessType: "private_limited",
  gstin: "29ABCDE1234F1Z5",
  addressLine1: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  accountNumber: "1234567890",
  ifsc: "HDFC0001234",
  accountHolder: "FreshLocal Retail",
  panNumber: "ABCDE1234F",
  documents: [
    { id: "d1", kind: "pan", fileName: "pan.pdf", uploadedAt: AT },
    { id: "d2", kind: "bank_proof", fileName: "cheque.jpg", uploadedAt: AT },
    { id: "d3", kind: "gst_certificate", fileName: "gst.pdf", uploadedAt: AT },
  ],
  logoUrl: "https://example.com/logo.png",
  tagline: "Fresh groceries, delivered fast.",
  fulfillmentModel: "hybrid",
  returnsAccepted: true,
};

// A partially-completed application (mid-onboarding).
export const SAMPLE_PARTIAL_DATA: SellerApplicationData = {
  ownerName: "Vikram Shah",
  email: "vikram@urbantech.example",
  phone: "+91 90000 22222",
  emailVerified: true,
  phoneVerified: false,
  storeName: "UrbanTech Store",
  storeSlug: "urbantech-store",
  category: "electronics",
  businessName: "UrbanTech",
  businessType: "proprietorship",
  gstExempt: false,
  // missing gstin, address, bank, pan, documents, branding, config
};

export const SAMPLE_COMPLETE_APPLICATION: SellerApplication = {
  ...createApplication("seller-1", SAMPLE_COMPLETE_DATA, AT),
  state: "active",
};

export const SAMPLE_PARTIAL_APPLICATION: SellerApplication = createApplication("seller-2", SAMPLE_PARTIAL_DATA, AT);

export const SAMPLE_ACTIVATION_INPUT: ActivationInput = {
  sellerId: "seller-1",
  storeName: "FreshLocal Mart",
  data: SAMPLE_COMPLETE_DATA,
  applicationState: "active",
  verification: { score: 100, decision: "auto_approve", passed: 4, total: 4, escalated: false },
  catalog: { products: 240, published: 220, averageQuality: 74 },
  trustScore: 82,
  lowStockCount: 6,
  openOrders: 3,
};

export const SAMPLE_GOVERNANCE_SELLERS: GovernanceSellerInput[] = [
  { sellerId: "seller-1", sellerName: "FreshLocal Mart", applicationState: "active", products: 240, createdAtHoursAgo: 720, verification: buildVerificationCase(SAMPLE_COMPLETE_APPLICATION) },
  { sellerId: "seller-2", sellerName: "UrbanTech Store", applicationState: "submitted", products: 0, createdAtHoursAgo: 6 },
  { sellerId: "seller-3", sellerName: "BloomCart", applicationState: "under_review", products: 18, createdAtHoursAgo: 30, catalogPendingReview: 8, verification: buildVerificationCase({ ...createApplication("seller-3", { ...SAMPLE_PARTIAL_DATA, panNumber: "ZZZZZ9999Z", gstin: "BAD" }, AT) }) },
  { sellerId: "seller-4", sellerName: "Cut-Rate Traders", applicationState: "submitted", products: 5, createdAtHoursAgo: 50, flagged: true, verification: buildVerificationCase({ ...createApplication("seller-4", { businessName: "X", accountHolder: "Someone Else", ifsc: "BAD", panNumber: "AAAAA0000A" }, AT) }) },
  { sellerId: "seller-5", sellerName: "MegaMart", applicationState: "active", products: 1200, createdAtHoursAgo: 2000 },
];

export const SAMPLE_POPULATION_SELLERS: PopulationSellerInput[] = [
  { sellerId: "seller-1", registered: true, verified: true, products: 240, publishedProducts: 220, active: true, categories: ["Groceries", "Staples"], catalogQuality: 74 },
  { sellerId: "seller-2", registered: true, verified: false, products: 0, publishedProducts: 0, active: false, categories: [], catalogQuality: 0 },
  { sellerId: "seller-3", registered: true, verified: true, products: 18, publishedProducts: 10, active: false, categories: ["Home", "Garden"], catalogQuality: 52 },
  { sellerId: "seller-4", registered: true, verified: false, products: 5, publishedProducts: 0, active: false, categories: ["Electronics"], catalogQuality: 30 },
  { sellerId: "seller-5", registered: true, verified: true, products: 1200, publishedProducts: 1180, active: true, categories: ["Electronics", "Accessories"], catalogQuality: 80 },
  { sellerId: "seller-6", registered: true, verified: true, products: 60, publishedProducts: 55, active: true, categories: ["Fashion"], catalogQuality: 68 },
];

export const SAMPLE_STOREFRONT_SELLER: StorefrontSellerInput = {
  sellerId: "seller-1",
  name: "FreshLocal Mart",
  slug: "freshlocal-mart",
  tagline: "Fresh groceries, delivered fast.",
  logoUrl: "https://example.com/logo.png",
  bannerUrl: "https://example.com/banner.png",
  verified: true,
  rating: 4.5,
  reviewCount: 312,
  trustScore: 82,
  returnsAccepted: true,
  fulfillmentModel: "hybrid",
};

export const SAMPLE_STOREFRONT_PRODUCTS: StorefrontProductInput[] = [
  { id: "p1", name: "Sona Masoori Rice 5kg", slug: "sona-masoori-rice-5kg", price: 599, category: "Groceries", stock: 24, imageUrl: "https://example.com/rice.jpg" },
  { id: "p2", name: "Cold-pressed Oil 1L", slug: "cold-pressed-oil-1l", price: 649, category: "Groceries", stock: 12 },
  { id: "p3", name: "Whole Wheat Atta 5kg", slug: "whole-wheat-atta-5kg", price: 430, category: "Staples", stock: 40 },
  { id: "p4", name: "Pure Ghee 1L", slug: "pure-ghee-1l", price: 799, category: "Staples", stock: 0 },
];

export const SAMPLE_IMPORT_CSV = `name,category,price,brand,stock,attributes
Premium Toor Dal 1kg,pulses-dals,180,FreshLocal,150,weight=1000
Cold-pressed Groundnut Oil 1L,edible-oils,649,FreshLocal,60,weight=1000
Garam Masala 200g,spices-masala,220,Patanjali,90,weight=200
Bad Row No Category,,,,,
`;
