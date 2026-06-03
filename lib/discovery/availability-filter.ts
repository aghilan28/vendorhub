import { StoreResult } from "./types";
import { CommerceLink } from "../commerce-graph/types";
import { AvailabilityRecord } from "../availability/types";

export class AvailabilityFilter {
  static filter(
    stores: any[],
    productId: string,
    links: CommerceLink[],
    availability: AvailabilityRecord[]
  ): StoreResult[] {
    return stores
      .map(s => {
        const link = links.find(l => l.productId === productId && l.storeId === s.store.id);
        const avail = availability.find(a => a.productId === productId && a.storeId === s.store.id);

        if (!link || !avail) return null;

        return {
          ...s,
          availability: {
            status: avail.status,
            eligibility: avail.eligibility,
          },
        };
      })
      .filter(Boolean) as StoreResult[];
  }
}
