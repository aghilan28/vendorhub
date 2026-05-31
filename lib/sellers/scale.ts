import type { CommerceRegion } from "@/types/commerce-foundation";
import { SellerNetworkEngine } from "./engine";
import { StoreClassification, STORE_TYPE_DEPARTMENTS } from "./classification";
import { buildSellerAnalytics } from "./analytics";
import { buildStoreSearchIndex } from "./search";
import { validateSellerNetwork } from "./validation";
import { STORE_TYPES, type SellerInput, type StoreInput } from "./types";

const REGIONS: CommerceRegion[] = ["TN", "KL", "KA", "AP", "TS"];

/** Deterministically generates a valid synthetic seller network (every store owned + classified). */
export function generateSyntheticSellerNetwork(sellerCount: number, storesPerSeller = 5): { sellers: SellerInput[]; stores: StoreInput[] } {
  const sellers: SellerInput[] = [];
  const stores: StoreInput[] = [];
  for (let s = 0; s < sellerCount; s += 1) {
    const region = REGIONS[s % REGIONS.length];
    sellers.push({ id: `s-${s}`, name: `Seller ${s}`, sellerType: "INDEPENDENT", homeRegion: region });
    for (let j = 0; j < storesPerSeller; j += 1) {
      const storeType = STORE_TYPES[(s + j) % STORE_TYPES.length];
      stores.push({
        id: `s-${s}-st-${j}`,
        name: `Store ${s}-${j}`,
        storeType,
        departments: STORE_TYPE_DEPARTMENTS[storeType],
        sellerId: `s-${s}`,
        location: { city: `City${(s + j) % 50}`, area: "Central", region, pincode: "560001", latitude: 12.9, longitude: 77.6 },
      });
    }
  }
  return { sellers, stores };
}

export interface SellerScaleResult {
  targetSellers: number;
  targetStores: number;
  generatedSellers: number;
  generatedStores: number;
  valid: boolean;
  errorCount: number;
  classificationOk: boolean;
  ownershipOk: boolean;
  searchReady: boolean;
  analyticsReady: boolean;
  performanceOk: boolean;
  buildMs: number;
}

export function certifySellerScaleTarget(sellerCount: number, storesPerSeller: number, performanceBudgetMs = 30_000): SellerScaleResult {
  const start = Date.now();
  const { sellers, stores } = generateSyntheticSellerNetwork(sellerCount, storesPerSeller);
  const engine = SellerNetworkEngine.fromInputs(sellers, stores);
  const report = validateSellerNetwork(engine.sellers(), engine.stores());
  const classification = new StoreClassification(engine);
  const buildMs = Date.now() - start;

  const sampleStore = engine.getStore("s-0-st-0");
  const ownershipOk = Boolean(sampleStore && engine.getStoresBySeller("s-0").length === storesPerSeller);
  const classificationOk = classification.unclassifiedStores().length === 0;
  const searchReady = buildStoreSearchIndex(engine).length === engine.storeCount;
  const analyticsReady = buildSellerAnalytics(engine).totalStores === engine.storeCount;

  return {
    targetSellers: sellerCount,
    targetStores: sellerCount * storesPerSeller,
    generatedSellers: engine.sellerCount,
    generatedStores: engine.storeCount,
    valid: report.valid,
    errorCount: report.errorCount,
    classificationOk,
    ownershipOk,
    searchReady,
    analyticsReady,
    performanceOk: buildMs <= performanceBudgetMs,
    buildMs,
  };
}

/** Runs the directive's scale tiers (100 & 1,000 sellers; 5,000 / 10,000 / 50,000 stores). */
export function runSellerScaleCertification(): SellerScaleResult[] {
  return [
    certifySellerScaleTarget(100, 5),
    certifySellerScaleTarget(1_000, 5),
    certifySellerScaleTarget(1_000, 5), // 5,000 stores
    certifySellerScaleTarget(2_000, 5), // 10,000 stores
    certifySellerScaleTarget(10_000, 5), // 50,000 stores
  ];
}
