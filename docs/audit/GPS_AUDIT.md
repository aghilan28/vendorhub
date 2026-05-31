# GPS & LOCATION AUDIT (Section 9)

## Schema & engine (real)
- **PostGIS** enabled (`extension postgis`); `geography` used in **15** places
  across migrations; tables `geo_product_indexes`, `locality_product_scores`,
  `product_logistics_profiles`; vendor `service_radius_km`.
- Phase 10 migration is named `true_hyperlocal_geo`; delivery/logistics geo in
  Phase 11.
- Runtime geo logic exists: `features/geo/components/` (`product-geo-panel`,
  `map-preview`, `hyperlocal-sections`), `features/logistics/eta.ts`,
  `dispatch-intelligence.ts`; distance/feasibility folded into search ranking.

| Capability | State | Evidence |
|------------|-------|----------|
| Maps | 🟡 | `map-preview` component; **no Google Maps/Mapbox SDK** in `package.json` — lightweight preview, not interactive maps |
| Location detection | 🟡 | browser geolocation in buyer location flow |
| Store radius | ✅ | `service_radius_km` + PostGIS geography |
| Delivery radius | ✅ | logistics geo feasibility |
| Nearby stores/products | ✅ | `geo_product_indexes`, `locality_product_scores`, distance in ranking |
| Location accuracy | 🟡 | depends on geolocation + seeded coords |
| Geospatial queries | ✅ | PostGIS `geography` distance |

## Conclusion
The geospatial **data model and distance/feasibility logic are real** (PostGIS,
hyperlocal scoring), which is a genuine differentiator vs many MVPs. The
**visual mapping layer is minimal** (no maps SDK) and accuracy is unproven
without live data.

**GPS score: 5/10** (strong geo backend; weak interactive maps; env/data-gated).
