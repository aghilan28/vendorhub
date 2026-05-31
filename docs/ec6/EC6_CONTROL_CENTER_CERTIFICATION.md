# EC-6 Phase 8 — Marketplace Control Center Certification

**Question:** Can operators run the marketplace? Audit of operator-facing surfaces.

| Surface | Route | Purpose | Status |
|---------|-------|---------|--------|
| Admin dashboard | `/admin/dashboard` | Operational snapshot (vendors/orders/refunds counts) | ✅ |
| Operations center | `/admin/operations` | 9-tab: Overview/Support/Disputes/Incidents/Fulfillment/Sellers/Customers/Refunds/Intelligence | ✅ |
| Trust governance | `/admin/trust` | Reputation, returns/refunds, support, trust intelligence | ✅ |
| Moderation | `/admin/moderation` (+ products, reviews) | Product/review/vendor moderation queues | ✅ |
| Flags / governance | `/admin/flags` | Governance cases + compliance flags | ✅ |
| Execution | `/admin/execution` | Initiative/action-plan tracking (M8) | ✅ |
| Vendors | `/admin/vendors` (+ `[id]`) | Vendor governance + verification | ✅ |
| Orders / Refunds | `/admin/orders`, `/admin/refunds` | Commerce oversight | ✅ |
| Audit logs | `/admin/audit-logs` | Full audit trail | ✅ |
| Growth / Intelligence | `/admin/growth`, `/admin/intelligence` | Growth + marketplace intelligence | ✅ |
| Buyer disputes | `/disputes` | Buyer-facing dispute filing/tracking | ✅ |
| Seller operations | `/seller/operations` | 8-tab seller cockpit | ✅ |

## RBAC
All `/admin/*` routes enforced by middleware (`current_user_has_role` ADMIN/SUPER_ADMIN); `/seller/*` enforced for SELLER+.

## Can operators run the marketplace?
**YES.** Operators have surfaces to: monitor marketplace health (operations center), moderate products/reviews/sellers, manage incidents (full lifecycle + postmortem), resolve disputes (with evidence + escalation), enforce trust actions (suspend/throttle/hold), oversee orders/refunds, audit every action, and act on operational-intelligence recommendations.

All surfaces emit in `next build` (98 static pages). 

**Status: PASS — operators can run VendorHub.**
