# BUYER EXPERIENCE AUDIT (Section 3)

Benchmarks: Amazon, Flipkart, Blinkit, Zepto. Grades reflect **code reality with
env + data present**, with the empty-without-env caveat noted.

Grades: ✅ Industry-grade · 🟡 Below industry-grade · ⚠️ Functional-but-empty · 🚧 Placeholder · ❌ Missing

| Surface | State | Grade | Evidence / gap |
|---------|-------|-------|----------------|
| Homepage | Real catalog grid | ⚠️🟡 | `listLiveProducts`; empty without env; no personalized rails/banners CMS |
| Search | pgvector hybrid + fuzzy + geo + multilingual | ✅ | `lib/ai/commerce-intelligence.ts` — genuinely strong; **no visible autocomplete/typeahead UI** |
| Categories | DB categories + filter | 🟡 | Works; facet richness below Amazon/Flipkart |
| Product discovery | AI related/recommendations | ✅ | `related_products_by_vector`, recommendation strip |
| Product pages | Real fetch | 🟡 | `getLiveProductBySlug`; **gallery fakes 4 views from one image**; specs/trust present |
| Store pages | Vendor browse | 🟡 | `vendorSlug` filter exists; dedicated storefront thin |
| Cart | Real per-user cart | ⚠️ | `listLiveCartItems` + reservation; empty fallback |
| Checkout | Transaction + payment | ⚠️ | Checkout transaction → Razorpay; COD supported |
| Orders | Real order history | ⚠️ | `listBuyerOrders` auth-gated |
| Tracking | Logistics ETA | 🟡 | `lib/logistics`, eta cards; live carrier integration partial |
| Wishlist | Real | ⚠️ | `lib/api/queries/wishlist.ts` |
| Reviews | **Placeholder text** | 🚧 | `getProductReviewSnippets` returns "Reviews will appear after verified real orders"; reviews table exists but no write UI |
| Ratings | Display only | 🟡 | `rating_average` shown; no buyer rating submission UI found |
| Notifications | Web push infra | 🟡 | `/api/push/subscribe` real; in-app center thin |
| Profile | Basic | 🟡 | Thin |
| Addresses | Not surfaced | ❌ | No dedicated address book UI found |
| Returns | Backend only | 🟡 | Refund RPC exists; buyer-initiated returns UI not found |
| Refunds | Backend strong | ✅ | `requestAndInitiateRefund` (Razorpay) — but buyer entry point thin |
| Support | Placeholder (seller side) | 🚧 | No buyer support/chat |

## Brutal summary
- **Strengths:** the *retrieval and transaction spine* (AI search, product fetch,
  cart, checkout, payment, refund) is real and above the typical hackathon bar.
- **Weaknesses:** the **content & trust loop is hollow** — no real product image
  gallery, **placeholder reviews**, no buyer rating/return UI, no address book.
- **Blocking reality:** without env + ingested catalog + images, the buyer sees an
  empty store. The #1 buyer-facing blocker is the **image pipeline** (below
  industry-grade — see IMAGE_PIPELINE_AUDIT) and the **reviews placeholder**.

**Buyer Experience score: 4/10** (strong skeleton, hollow content/trust, empty
without data).
