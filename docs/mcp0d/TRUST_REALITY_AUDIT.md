# MCP-0D.1 — Trust Reality Audit (Baseline)

Source-of-truth audit before this phase (re-verified against the repo).

| Capability | Before MCP-0D | Evidence |
|------------|---------------|----------|
| Reviews | ✅ schema, ⚠️ surface | `reviews` (rating, is_verified_purchase, moderation_status) + `review_votes`; product page showed **placeholder** reviews |
| Ratings | ✅ field | `rating_average` on products/vendors; no aggregation/distribution surface |
| Seller trust (KYC) | ✅ | `features/trust` KYC scoring + `trust_scores`, `trust_integrity_scores` |
| Seller reputation (operational) | ❌ | no fulfilment/return/refund/complaint reputation |
| Product reputation | ❌ | no product trust/confidence score |
| Returns | 🟡 | refund pipeline existed; no buyer-facing returns workflow |
| Refunds | ✅ backend | `refund_requests` + Razorpay refund RPCs |
| Disputes | ✅ schema | `marketplace_disputes`, `dispute_evidence` |
| Support | ❌ | no tickets system |
| Product Q&A | ❌ | none |
| Trust intelligence | 🟡 | governance signals existed; no unified fraud/abuse/risk on real activity |
| Buyer trust dashboard | ❌ | no buyer-facing trust signals |

## Verdict (before)
Strong **KYC + dispute + refund** foundations, but **no operational reputation, no
product reputation, no Q&A, no support, placeholder reviews, and no buyer trust
surface**. Customers had little visible reason to trust.

## What MCP-0D delivers
A deterministic Trust engine (`lib/trust/`) operating on **real** activity
(reviews, orders, returns, refunds, sellers) + buyer trust panel, admin Trust
Governance Center, seller reputation view, trust intelligence, and migrations for
Q&A / returns / support. See the remaining MCP-0D documents.
