import type { FulfillmentMode, FulfillmentProfile, StoreFormatType } from "./types";

/**
 * Fulfillment engine (Phase 5). Derives a store's fulfillment modes, primary mode and radius from its
 * store-format type. Produces a fulfillment readiness projection consumable by future delivery logic
 * (delivery itself is NOT started here).
 */
export function fulfillmentProfileFor(formatType: StoreFormatType, hyperlocal: boolean): FulfillmentProfile {
  switch (formatType) {
    case "DARK_STORE":
      return { modes: ["DARK_STORE_FULFILLMENT", "STORE_DELIVERY"], primaryMode: "DARK_STORE_FULFILLMENT", maxFulfillmentRadiusKm: 5 };
    case "MICRO_HUB":
      return { modes: ["DARK_STORE_FULFILLMENT", "STORE_DELIVERY", "PICKUP"], primaryMode: "DARK_STORE_FULFILLMENT", maxFulfillmentRadiusKm: 3 };
    case "WAREHOUSE":
    case "FULFILLMENT_CENTER":
      return { modes: ["WAREHOUSE_FULFILLMENT", "COURIER", "PARTNER_DELIVERY"], primaryMode: "WAREHOUSE_FULFILLMENT", maxFulfillmentRadiusKm: 50 };
    case "HYBRID_STORE":
      return { modes: ["HYBRID_FULFILLMENT", "PICKUP", "STORE_DELIVERY", "COURIER"], primaryMode: "HYBRID_FULFILLMENT", maxFulfillmentRadiusKm: 15 };
    default: {
      const modes: FulfillmentMode[] = ["PICKUP", "STORE_DELIVERY", "COURIER", "PARTNER_DELIVERY"];
      return { modes, primaryMode: "STORE_DELIVERY", maxFulfillmentRadiusKm: hyperlocal ? 8 : 12 };
    }
  }
}
