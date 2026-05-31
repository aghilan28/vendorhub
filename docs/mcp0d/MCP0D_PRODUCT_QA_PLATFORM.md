# MCP-0D.3 — Product Q&A Platform

Engine: `lib/trust/qa.ts` · Schema: `product_questions`, `product_answers` (RLS).

| Capability | Delivered |
|------------|-----------|
| Product questions | ✅ `product_questions` + `validateQuestion` |
| Seller answers | ✅ `product_answers.by_seller` |
| Community answers | ✅ `product_answers` |
| Answer voting | ✅ `votes` |
| Accepted answers | ✅ `accepted` + `bestAnswer` (accepted → seller → most-voted) |
| Question moderation | ✅ `status` (open/answered/hidden) + RLS hides moderated |
| Question analytics | ✅ `qaAnalytics` (answer rate, seller-answered, unanswered) |

RLS: questions public unless hidden; authenticated users ask/answer as themselves.
Verified by tests (validation, best-answer selection, analytics).
