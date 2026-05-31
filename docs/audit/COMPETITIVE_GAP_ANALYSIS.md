# COMPETITIVE GAP ANALYSIS (Section 14)

VendorHub vs Amazon, Flipkart, Blinkit, Zepto, Meesho, Shopify (marketplace).

## Where VendorHub is competitive (real, code-backed)
- **Hyperlocal + AI search:** pgvector hybrid retrieval, multilingual/
  transliteration, geo feasibility ranking — comparable in *architecture* to
  Blinkit/Zepto discovery and ahead of most MVPs.
- **Reconciled payments:** Razorpay orders + refunds + double-entry accounting
  adjustments — closer to production fintech rigor than typical clones.
- **PostGIS hyperlocal model:** real geography distance, service radius, locality
  product scoring — a genuine differentiator.
- **Security/observability:** RLS, audited guarded mutations, Sentry, rate limits.

## Missing vs incumbents (high impact)
| Capability | Amazon/Flipkart | Blinkit/Zepto | VendorHub |
|------------|-----------------|---------------|-----------|
| Seller image upload + media pipeline | ✅ | ✅ | ❌ |
| Product reviews & ratings (write) | ✅ | ✅ | ❌ (placeholder) |
| Variants/attributes management UI | ✅ | ✅ | 🟡 schema only |
| Coupons / promotions / offers | ✅ | ✅ | ❌ |
| Address book & multi-address checkout | ✅ | ✅ | ❌ |
| Returns/cancellation self-service | ✅ | ✅ | 🟡 backend only |
| Bulk catalog ingestion/import | ✅ | ✅ | ❌ (SQL seed only) |
| Seller payouts | ✅ | ✅ | 🚧 placeholder |
| Real-time order tracking (carrier) | ✅ | ✅ | 🟡 partial |
| Interactive maps | ✅ | ✅ | 🟡 preview only |
| Autocomplete/typeahead search | ✅ | ✅ | ❌ |
| Live data without manual seeding | ✅ | ✅ | ❌ (env+seed gated) |

## Weak (exists but below grade)
- Seller dashboard (mixes real + stub), seller analytics, notifications channels,
  buyer profile/account, storefront pages.

## Differentiators / potential advantages
- The **intelligence engines** (knowledge/simulation/SECIS/execution) — *if wired
  to live commerce data* — could be a real moat (autonomous merchandising,
  governed decisions). Today they are demo-grade.
- South-Indian hyperlocal + multilingual focus is a sharp wedge vs generic clones.

## Verdict
VendorHub competes on **discovery architecture, payments rigor, and hyperlocal
geo**, but is **not yet a usable consumer marketplace** because of missing
**images, reviews, coupons, addresses, returns/payouts UX, and data liveness**.
The intelligence "moat" is currently unrealized (not integrated).
