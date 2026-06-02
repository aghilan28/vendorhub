import type { Vendor } from "@/types";
import {
  ClusterEngine,
  CoverageEngine,
  GeoIntelligenceEngine,
  GeoSearchProjection,
  GovernanceEngine,
  PincodeEngine,
  StoreUniverseAdapter,
  ValidationEngine,
  ZoneEngine,
} from "./engines";

/**
 * StoreGeoOrchestrator
 * Orchestrates the full end-to-end geographic processing flow.
 */
export class StoreGeoOrchestrator {
  /**
   * Process a store through the full geo pipeline.
   * Flow: Store Universe -> Geo Profile -> Pincode -> Coverage -> Cluster -> Zone -> Search Projection -> Intelligence -> Validation -> Governance
   */
  static processStore(vendor: Vendor, context: any = {}) {
    // 1. Store Universe
    const adaptedStore = StoreUniverseAdapter.adapt(vendor);

    // 2. Geo Profile (Implicit in adaptedStore.location)
    const geoProfile = {
      vendor_id: adaptedStore.id,
      location: adaptedStore.location,
      city: adaptedStore.location.city,
    };

    // 3. Pincode Assignment
    const pincode = (vendor as any).pincode || (vendor as any).metadata?.pincode;
    const pincodeValid = pincode ? PincodeEngine.validatePincode(pincode) : false;

    // 4. Coverage Profile
    const coverage = CoverageEngine.calculateCoverage(
      adaptedStore.location,
      adaptedStore.capabilities.radius_km
    );

    // 5. Cluster Assignment
    const cluster = ClusterEngine.assignToCluster(adaptedStore.location, context.clusters || []);

    // 6. Zone Assignment
    const zone = ZoneEngine.getZone(adaptedStore.location, context.zones || []);

    // 7. Search Projection
    const searchProjection = GeoSearchProjection.project(adaptedStore);

    // 8. Geo Intelligence
    const intelligence = GeoIntelligenceEngine.analyzeDemand(
      adaptedStore.location,
      context.historicalOrders || []
    );

    // 9. Validation
    const isValid = ValidationEngine.validateProfile(geoProfile);

    // 10. Governance
    const governance = GovernanceEngine.checkCompliance(geoProfile, context.policy || {});

    return {
      store_id: adaptedStore.id,
      success: isValid && governance.compliant,
      pipeline_output: {
        adaptedStore,
        geoProfile,
        pincode: { value: pincode, valid: pincodeValid },
        coverage,
        cluster,
        zone,
        searchProjection,
        intelligence,
        validation: { isValid },
        governance,
      },
      processed_at: new Date().toISOString(),
    };
  }

  static processUniverse(vendors: Vendor[], context: any = {}) {
    return vendors.map(v => this.processStore(v, context));
  }
}
