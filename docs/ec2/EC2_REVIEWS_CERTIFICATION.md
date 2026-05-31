# EC-2 Phase 5 — Reviews & Ratings Certification

**Module:** `lib/commerce-core/reviews.ts` · Actions: `lib/actions/reviews.ts` · UI: `components/commerce/review-submission-form.tsx` (mounted on `/product/[slug]`) · Tables: `reviews` (existing), `review_reports`, `review_responses` (new).

## Audit confirmation
Prior state was **display-only** (no write path). EC-2 closes the submission gap.

## Delivered
- **Review submission** — `submitReviewAction` writes to real `reviews` table; `ReviewSubmissionForm` (star rating + title + body) mounted on product page.
- **Rating submission** — integral to review (1–5 integer enforced).
- **Verified-purchase enforcement** — action queries delivered/completed `order_items` for the user+product; sets `is_verified_purchase`; unverified reviews → `PENDING` moderation.
- **Fraud prevention** — `validateReview` heuristics (unverified +30, velocity +10/25, links +30, terse +10) → `fraudScore`; ≥70 ⇒ `FLAGGED`.
- **Review moderation** — `moderateReview` (approve/flag/remove/restore) over `VISIBLE/PENDING/FLAGGED/REMOVED`.
- **Seller responses** — `createSellerResponse` + `respondToReviewAction` → `review_responses` (RLS: vendor members).
- **Review reporting** — `reportReviewAction` → `review_reports` (any authed user).
- **Review analytics** — `aggregateRatings` (average, count, distribution over VISIBLE only).
- **Editing** — duplicate-per-product blocked; re-submission guarded.

## Tests: 9 review tests (valid verified, bad input, fraud flagging, unverified→pending, duplicate block, link detection, moderation transitions, seller response, aggregation).

**Status: COMPLETE.**
