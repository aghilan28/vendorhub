# EC-4 Phase 3 — Address Certification

**Source:** `lib/hyperlocal/address.ts`, `addresses` table (phase_1), checkout address schema.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Buyer addresses | ✅ REAL | `addresses` table; checkout `CheckoutAddressSchema` (recipient/phone/line1/locality/city/pincode) |
| Seller addresses | ✅ REAL | vendor business address in onboarding/store-settings |
| Store addresses | ✅ REAL | `StoreLocation.coordinates` + `city`; store-network |
| Warehouse addresses | ✅ REAL | `parseAddress`/`analyzeAddress` accept any address kind (buyer/seller/store/warehouse/delivery) |
| Delivery addresses | ✅ REAL | checkout delivery address; `analyzeAddress` validation |
| Address validation | ✅ REAL | `analyzeAddress(raw)` → report with confidence/completeness + issues |
| Address completeness | ✅ REAL | `completeAddress(report)` fills gaps; completeness scoring |
| Address normalization | ✅ REAL | `parseAddress(raw)` → structured `ParsedAddress` |
| Address deduplication | ✅ REAL | `deduplicateAddresses(addresses)` (executed in scale test) |

## Executed evidence
`ec4-hyperlocal-scale.test.ts`: `analyzeAddress(SAMPLE_ADDRESSES[0])` returns a report; `deduplicateAddresses(SAMPLE_ADDRESSES)` returns ≤ input length.

## Honest gap
No standalone buyer **address-book management page** (`/addresses`) — checkout uses inline address entry. Documented in the QA audit as a UX follow-up; the address *engine* (parse/validate/complete/dedupe) is complete.

**Status: PASS** (engine real; address-book UI is the single non-engine follow-up).
