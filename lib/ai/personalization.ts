import { createHash } from "crypto";
import type { BuyerLocation, Product } from "@/types";
import type { BehavioralCommerceEvent, RecommendationContext } from "@/features/intelligence/types";

export type CommerceBehaviorType =
  | BehavioralCommerceEvent["type"]
  | "cart_add"
  | "purchase"
  | "skip"
  | "search_refinement"
  | "cart_abandonment"
  | "delivery_satisfaction"
  | "refund";

export interface CommerceBehaviorEvent {
  type: CommerceBehaviorType;
  productId?: string;
  categorySlug?: string;
  vendorId?: string;
  query?: string;
  locality?: string;
  createdAt: string;
  weight?: number;
}

export interface PersonalizationProfile {
  fingerprint: string;
  isAnonymous: boolean;
  isColdStart: boolean;
  sessionSignals: RecommendationContext;
  categoryAffinity: Record<string, number>;
  sellerAffinity: Record<string, number>;
  queryAffinity: Record<string, number>;
  localityAffinity: Record<string, number>;
  recalibrationNeeded: boolean;
  drift: {
    detected: boolean;
    stalePreferenceRisk: boolean;
    negativeFeedbackRatio: number;
    lastSignalAt?: string;
    recoveryActions: string[];
  };
  privacy: {
    rawIdentifiersStored: false;
    retentionDays: number;
    eventCount: number;
  };
}

const MAX_PROFILE_EVENTS = 80;
const RETENTION_DAYS = 45;

const eventWeights: Record<CommerceBehaviorType, number> = {
  product_click: 0.7,
  category_explore: 0.45,
  search_interaction: 0.55,
  add_to_cart_intent: 0.85,
  recommendation_interaction: 0.5,
  cart_add: 0.95,
  purchase: 1.25,
  skip: -0.22,
  search_refinement: 0.35,
  cart_abandonment: -0.18,
  delivery_satisfaction: 0.42,
  refund: -0.5,
};

const negativeBehavior = new Set<CommerceBehaviorType>(["skip", "cart_abandonment", "refund", "search_refinement"]);

function bounded(value: number) {
  return Math.max(0, Math.min(1, value));
}

function ageDecay(createdAt: string, now = Date.now()) {
  const ageDays = Math.max(0, (now - new Date(createdAt).getTime()) / 86_400_000);
  return Math.exp(-ageDays / 21);
}

function addSignal(target: Record<string, number>, key: string | undefined, value: number) {
  if (!key) return;
  target[key] = bounded((target[key] ?? 0) + value);
}

function topKeys(record: Record<string, number>, limit: number) {
  return Object.entries(record)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit)
    .map(([key]) => key);
}

function profileFingerprint(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
}

export function buildPersonalizationProfile(input: {
  events?: CommerceBehaviorEvent[];
  products?: Product[];
  buyerLocation?: BuyerLocation | null;
  anonymousId?: string;
  userScopedSalt?: string;
}): PersonalizationProfile {
  const now = Date.now();
  const recentEvents = (input.events ?? [])
    .filter((event) => Number.isFinite(new Date(event.createdAt).getTime()))
    .filter((event) => now - new Date(event.createdAt).getTime() <= RETENTION_DAYS * 86_400_000)
    .slice(-MAX_PROFILE_EVENTS);
  const productsById = new Map((input.products ?? []).map((product) => [product.id, product]));
  const categoryAffinity: Record<string, number> = {};
  const sellerAffinity: Record<string, number> = {};
  const queryAffinity: Record<string, number> = {};
  const localityAffinity: Record<string, number> = {};
  const negativeEvents = recentEvents.filter((event) => negativeBehavior.has(event.type)).length;
  const negativeFeedbackRatio = recentEvents.length ? negativeEvents / recentEvents.length : 0;
  const lastSignalAt = recentEvents.at(-1)?.createdAt;
  const stalePreferenceRisk = Boolean(lastSignalAt && now - new Date(lastSignalAt).getTime() > 14 * 86_400_000);
  const driftDetected = recentEvents.length >= 6 && negativeFeedbackRatio > 0.42;

  for (const event of recentEvents) {
    const product = event.productId ? productsById.get(event.productId) : undefined;
    const signedWeight = (event.weight ?? eventWeights[event.type] ?? 0.25) * ageDecay(event.createdAt, now);
    addSignal(categoryAffinity, event.categorySlug ?? product?.category.slug, signedWeight * 0.32);
    addSignal(sellerAffinity, event.vendorId ?? product?.vendor.id, signedWeight * 0.26);
    addSignal(localityAffinity, event.locality ?? product?.vendor.locality, signedWeight * 0.16);
    for (const token of (event.query ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      addSignal(queryAffinity, token, signedWeight * 0.12);
    }
  }

  if (input.buyerLocation?.locality) addSignal(localityAffinity, input.buyerLocation.locality, 0.34);

  const sessionSignals: RecommendationContext = {
    recentlyViewedProductIds: [...new Set(recentEvents.filter((event) => event.productId).map((event) => event.productId as string))].slice(-10),
    exploredCategorySlugs: topKeys(categoryAffinity, 10),
    recentQueries: topKeys(queryAffinity, 8),
    locationLocality: input.buyerLocation?.locality ?? topKeys(localityAffinity, 1)[0],
    isNewUser: recentEvents.length < 3,
  };

  const fingerprint = profileFingerprint([
    input.userScopedSalt ? "known" : "anonymous",
    input.anonymousId ? createHash("sha256").update(input.anonymousId).digest("hex").slice(0, 12) : "none",
    sessionSignals,
    topKeys(sellerAffinity, 8),
    topKeys(localityAffinity, 4),
  ]);

  return {
    fingerprint,
    isAnonymous: !input.userScopedSalt,
    isColdStart: Boolean(sessionSignals.isNewUser),
    sessionSignals,
    categoryAffinity,
    sellerAffinity,
    queryAffinity,
    localityAffinity,
    recalibrationNeeded: driftDetected || stalePreferenceRisk || recentEvents.some((event) => event.type === "refund" || event.type === "cart_abandonment" || event.type === "search_refinement"),
    drift: {
      detected: driftDetected,
      stalePreferenceRisk,
      negativeFeedbackRatio,
      lastSignalAt,
      recoveryActions: driftDetected
        ? ["reduce repeated category boosts", "widen recommendation diversity", "request personalization refresh"]
        : stalePreferenceRisk
          ? ["decay stale affinities", "blend cold-start local demand", "refresh anonymous placeholder profile"]
          : ["normal adaptive personalization"],
    },
    privacy: {
      rawIdentifiersStored: false,
      retentionDays: RETENTION_DAYS,
      eventCount: recentEvents.length,
    },
  };
}

export function personalizationScore(product: Product, profile?: PersonalizationProfile | null) {
  if (!profile) return 0.35;
  const category = profile.categoryAffinity[product.category.slug] ?? 0;
  const seller = profile.sellerAffinity[product.vendor.id] ?? 0;
  const locality = product.vendor.locality ? profile.localityAffinity[product.vendor.locality] ?? 0 : 0;
  const queryText = [product.name, product.description, ...(product.tags ?? [])].join(" ").toLowerCase();
  const query = Object.entries(profile.queryAffinity).reduce((sum, [token, score]) => sum + (queryText.includes(token) ? score : 0), 0);
  const novelty = profile.sessionSignals.recentlyViewedProductIds?.includes(product.id) ? 0.03 : 0.16;
  return bounded(0.22 + category * 0.32 + seller * 0.24 + locality * 0.16 + query * 0.18 + novelty);
}

export function contextFromPersonalization(profile?: PersonalizationProfile | null): RecommendationContext | undefined {
  return profile?.sessionSignals;
}
