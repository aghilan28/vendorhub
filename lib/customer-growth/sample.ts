// MCP-1D — Deterministic sample customer-growth data (PREVIEW ONLY).
//
// Renders surfaces before sign-in / without Supabase. Always labelled; never
// drives a "live" count. Bengaluru-centred to match the MCP-1C hyperlocal data.

import type {
  CampaignInput,
  CustomerProfileInput,
  EngagementEventInput,
  ReferralRecord,
  RewardLedgerEntry,
} from "./types";
import type { BehaviorSignal } from "./personalization";
import type { ProductCandidate, StoreCandidate } from "./recommendations";

export const SAMPLE_CUSTOMER_ID = "cust-001";

export const SAMPLE_PROFILE: CustomerProfileInput = {
  customerId: SAMPLE_CUSTOMER_ID,
  name: "Aarav Sharma",
  email: "aarav@example.com",
  phone: "+91 90000 12345",
  city: "Bengaluru",
  pincode: "560034",
  joinedDaysAgo: 240,
  interests: ["Mobiles", "Groceries", "Home"],
  preferredCategories: ["Mobiles", "Groceries"],
  preferredStores: ["s1", "s3"],
  savedAddresses: 2,
  savedStores: 3,
  savedProducts: 7,
  emailVerified: true,
  phoneVerified: true,
  activity: { orders: 7, totalSpend: 18450, lastOrderDaysAgo: 12, firstOrderDaysAgo: 220, avgOrderValue: 2635, reviews: 3, returns: 1, sessionsLast30: 9, wishlistItems: 7 },
};

/** A spread of customers across lifecycle stages for admin/intelligence views. */
export const SAMPLE_CUSTOMERS: CustomerProfileInput[] = [
  SAMPLE_PROFILE,
  { customerId: "cust-002", name: "Priya N", city: "Bengaluru", pincode: "560066", joinedDaysAgo: 400, emailVerified: true, activity: { orders: 14, totalSpend: 42600, lastOrderDaysAgo: 6, firstOrderDaysAgo: 380, reviews: 8, returns: 0, sessionsLast30: 15, wishlistItems: 12 } }, // VIP
  { customerId: "cust-003", name: "Rahul K", city: "Bengaluru", pincode: "560038", joinedDaysAgo: 90, activity: { orders: 2, totalSpend: 2400, lastOrderDaysAgo: 20, firstOrderDaysAgo: 60, reviews: 0, returns: 0, sessionsLast30: 3, wishlistItems: 2 } }, // promising
  { customerId: "cust-004", name: "Meera D", city: "Bengaluru", pincode: "560024", joinedDaysAgo: 200, activity: { orders: 3, totalSpend: 5100, lastOrderDaysAgo: 70, firstOrderDaysAgo: 180, reviews: 1, returns: 1, sessionsLast30: 1, wishlistItems: 4 } }, // at_risk
  { customerId: "cust-005", name: "Sahil R", city: "Bengaluru", pincode: "560001", joinedDaysAgo: 320, activity: { orders: 5, totalSpend: 9800, lastOrderDaysAgo: 120, firstOrderDaysAgo: 300, reviews: 2, returns: 3, sessionsLast30: 0, wishlistItems: 1 } }, // dormant
  { customerId: "cust-006", name: "Ananya P", city: "Bengaluru", pincode: "560011", joinedDaysAgo: 15, activity: { orders: 1, totalSpend: 899, lastOrderDaysAgo: 10, firstOrderDaysAgo: 12, reviews: 0, returns: 0, sessionsLast30: 4, wishlistItems: 3 } }, // new
  { customerId: "cust-007", name: "Vikram S", city: "Bengaluru", pincode: "560076", joinedDaysAgo: 500, activity: { orders: 4, totalSpend: 6200, lastOrderDaysAgo: 220, firstOrderDaysAgo: 460, reviews: 1, returns: 0, sessionsLast30: 0, wishlistItems: 0 } }, // churned
  { customerId: "cust-008", name: "Diya M", city: "Bengaluru", pincode: "560103", joinedDaysAgo: 0, activity: { orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null, sessionsLast30: 2, wishlistItems: 1 } }, // visitor/new
];

export const SAMPLE_NAMES: Record<string, string> = Object.fromEntries(
  SAMPLE_CUSTOMERS.map((c) => [c.customerId, c.name ?? c.customerId]),
);

/** Reward ledger for the sample customer — earns, a redemption and an expiry. */
export const SAMPLE_LEDGER: RewardLedgerEntry[] = [
  { id: "rl-1", customerId: SAMPLE_CUSTOMER_ID, points: 100, reason: "signup", daysAgo: 240, expiresInDays: 365 },
  { id: "rl-2", customerId: SAMPLE_CUSTOMER_ID, points: 1850, reason: "order", refId: "o-1", daysAgo: 200, expiresInDays: 365 },
  { id: "rl-3", customerId: SAMPLE_CUSTOMER_ID, points: 60, reason: "review", refId: "rv-1", daysAgo: 150, expiresInDays: 365 },
  { id: "rl-4", customerId: SAMPLE_CUSTOMER_ID, points: 200, reason: "referral", refId: "ref-1", daysAgo: 120, expiresInDays: 365 },
  { id: "rl-5", customerId: SAMPLE_CUSTOMER_ID, points: 2400, reason: "order", refId: "o-2", daysAgo: 60, expiresInDays: 365 },
  { id: "rl-6", customerId: SAMPLE_CUSTOMER_ID, points: -500, reason: "redemption", refId: "rd-50", daysAgo: 40 },
  { id: "rl-7", customerId: SAMPLE_CUSTOMER_ID, points: 900, reason: "order", refId: "o-3", daysAgo: 345, expiresInDays: 365 }, // expiring soon (365-345=20)
  { id: "rl-8", customerId: SAMPLE_CUSTOMER_ID, points: -50, reason: "expiration", daysAgo: 5 },
];

export const SAMPLE_REFERRALS: ReferralRecord[] = [
  { id: "ref-1", referrerId: SAMPLE_CUSTOMER_ID, refereeId: "cust-003", code: "VH...", status: "rewarded", createdDaysAgo: 120, refereeOrders: 2, refereeSpend: 2400, sameDevice: false },
  { id: "ref-2", referrerId: SAMPLE_CUSTOMER_ID, refereeId: "cust-006", code: "VH...", status: "pending", createdDaysAgo: 14, refereeOrders: 1, refereeSpend: 899, sameDevice: false },
  { id: "ref-3", referrerId: SAMPLE_CUSTOMER_ID, refereeId: "cust-009", code: "VH...", status: "pending", createdDaysAgo: 5, refereeOrders: 0, refereeSpend: 0, sameDevice: false },
  { id: "ref-4", referrerId: SAMPLE_CUSTOMER_ID, refereeId: SAMPLE_CUSTOMER_ID, code: "VH...", status: "pending", createdDaysAgo: 3, refereeOrders: 1, refereeSpend: 500, sameDevice: true }, // fraud: self + same device
  { id: "ref-5", referrerId: "cust-002", refereeId: "cust-010", code: "VH...", status: "rewarded", createdDaysAgo: 60, refereeOrders: 3, refereeSpend: 5400, sameDevice: false },
  { id: "ref-6", referrerId: "cust-002", refereeId: "cust-011", code: "VH...", status: "rewarded", createdDaysAgo: 30, refereeOrders: 1, refereeSpend: 1200, sameDevice: false },
];

export const SAMPLE_CAMPAIGNS: CampaignInput[] = [
  { id: "camp-1", name: "Festive Mobiles Sale", type: "category", status: "active", audience: ["all"], startDaysAgo: 3, durationDays: 10, discountPercent: 15, budget: 50000, targetCategories: ["Mobiles"], impressions: 42000, clicks: 2100, redemptions: 320, revenue: 410000, spend: 90000 },
  { id: "camp-2", name: "Win Back At-Risk", type: "coupon", status: "active", audience: ["at_risk", "dormant"], startDaysAgo: 1, durationDays: 14, discountPercent: 20, budget: 20000, impressions: 8000, clicks: 520, redemptions: 64, revenue: 96000, spend: 18000 },
  { id: "camp-3", name: "Whitefield Hyperlocal Launch", type: "hyperlocal", status: "scheduled", audience: ["all"], startDaysAgo: -4, durationDays: 7, discountPercent: 10, budget: 15000, targetPincodes: ["560066"] },
  { id: "camp-4", name: "New Year Mega", type: "seasonal", status: "completed", audience: ["all"], startDaysAgo: 40, durationDays: 7, discountPercent: 25, budget: 100000, impressions: 120000, clicks: 7800, redemptions: 1500, revenue: 1800000, spend: 240000 },
  { id: "camp-5", name: "Draft Grocery Bundle", type: "discount", status: "draft", audience: ["loyal"], startDaysAgo: -10, durationDays: 0 }, // invalid: 0 duration
];

export const SAMPLE_ENGAGEMENT: EngagementEventInput[] = [
  { id: "e-1", customerId: SAMPLE_CUSTOMER_ID, kind: "price_drop", channel: "push", daysAgo: 1, delivered: true, opened: true, clicked: true, title: "Price drop", body: "iPhone case dropped to ₹399." },
  { id: "e-2", customerId: SAMPLE_CUSTOMER_ID, kind: "restock", channel: "push", daysAgo: 3, delivered: true, opened: false },
  { id: "e-3", customerId: SAMPLE_CUSTOMER_ID, kind: "reward", channel: "email", daysAgo: 5, delivered: true, opened: true, clicked: false, title: "Points expiring", body: "900 points expire soon." },
  { id: "e-4", customerId: SAMPLE_CUSTOMER_ID, kind: "order", channel: "in_app", daysAgo: 12, delivered: true, opened: true, clicked: true },
  { id: "e-5", customerId: "cust-004", kind: "campaign", channel: "email", daysAgo: 1, delivered: true, opened: false },
  { id: "e-6", customerId: "cust-002", kind: "store", channel: "in_app", daysAgo: 2, delivered: true, opened: true },
  { id: "e-7", customerId: "cust-005", kind: "campaign", channel: "email", daysAgo: 1, delivered: false },
];

export const SAMPLE_BEHAVIOR: BehaviorSignal[] = [
  { kind: "category", key: "Mobiles", label: "Mobiles", views: 22, purchases: 3, wishlists: 4 },
  { kind: "category", key: "Groceries", label: "Groceries", views: 15, purchases: 4, wishlists: 1 },
  { kind: "category", key: "Home", label: "Home", views: 8, purchases: 0, wishlists: 2 },
  { kind: "brand", key: "Apple", label: "Apple", views: 12, purchases: 1, wishlists: 2 },
  { kind: "brand", key: "Samsung", label: "Samsung", views: 6, purchases: 1, wishlists: 1 },
  { kind: "store", key: "s1", label: "FreshLocal Mart", views: 18, purchases: 4, wishlists: 0 },
  { kind: "store", key: "s3", label: "BloomCart", views: 9, purchases: 2, wishlists: 1 },
  { kind: "location", key: "560034", label: "Koramangala", views: 20, purchases: 6, wishlists: 0 },
];

export const SAMPLE_PRODUCTS: ProductCandidate[] = [
  { id: "p1", title: "Wireless Earbuds Pro", category: "Mobiles", brand: "Apple", storeId: "s1", price: 4999, rating: 4.6, popularity: 88, trending: true, distanceKm: 2.1 },
  { id: "p2", title: "Organic Rice 5kg", category: "Groceries", brand: "FreshLocal", storeId: "s1", price: 549, rating: 4.4, popularity: 72, distanceKm: 2.1 },
  { id: "p3", title: "Smartphone Stand", category: "Mobiles", brand: "Generic", storeId: "s3", price: 299, rating: 4.1, popularity: 40, distanceKm: 4.3 },
  { id: "p4", title: "Premium Coffee Beans", category: "Groceries", brand: "BeanCo", storeId: "s3", price: 899, rating: 4.8, popularity: 65, trending: true, distanceKm: 4.3 },
  { id: "p5", title: "LED Desk Lamp", category: "Home", brand: "Brighten", storeId: "s2", price: 1299, rating: 4.2, popularity: 55, distanceKm: 6.0 },
  { id: "p6", title: "Flagship Smartphone", category: "Mobiles", brand: "Samsung", storeId: "s2", price: 64999, rating: 4.5, popularity: 80, distanceKm: 6.0 },
];

export const SAMPLE_STORES_REC: StoreCandidate[] = [
  { id: "s1", name: "FreshLocal Mart", rating: 4.5, popularity: 86, trending: true, distanceKm: 2.1 },
  { id: "s3", name: "BloomCart", rating: 4.7, popularity: 70, distanceKm: 4.3 },
  { id: "s2", name: "UrbanTech Store", rating: 4.2, popularity: 64, trending: true, distanceKm: 6.0 },
];

export const SAMPLE_RECENTLY_VIEWED: ProductCandidate[] = [SAMPLE_PRODUCTS[0], SAMPLE_PRODUCTS[5]];
export const SAMPLE_ABANDONED_CART: ProductCandidate[] = [SAMPLE_PRODUCTS[1]];

export const SAMPLE_DEMAND_CELLS = [
  { pincode: "560001", demand: 55, stores: 0 },
  { pincode: "560103", demand: 22, stores: 0 },
  { pincode: "560034", demand: 70, stores: 1 },
];
