# MCP-0A.7 — Media Moderation Platform

Source: `lib/media/moderation.ts`; admin surface
`features/media/components/admin-media-center.tsx` + `lib/media/queries.ts`;
persistence `media_moderation` table.

## State machine
`pending → approved | rejected | flagged | escalated`; `flagged → approved |
rejected | escalated`; `escalated → approved | rejected`; `approved → flagged`;
`rejected` terminal. Enforced by `MODERATION_TRANSITIONS` + `applyModeration`.

## Risk scoring
`computeRiskScore({ analysis, quality })` → 0-100 with reasons
(unsafe_content, duplicate, watermark, low_quality, suspicious_size).

## Auto-moderation routing
`autoModerate()`: unsafe>0.85 → rejected; risk≥50 → flagged; risk≥25 → pending;
else auto-approved (system). Low-risk media skips human review at scale.

## Queue
`orderQueue()` prioritises escalated → flagged → pending, then by descending
risk, so reviewers always see the riskiest items first. Bulk approve/reject and
moderation history are backed by `media_moderation` + `media_audit`.

## Admin capabilities (delivered)
Coverage/integrity/duplicate analytics today (computed from real `product_images`);
approve/reject/flag write-paths activate against `media_moderation` once the
worker populates hashes/analysis (tables provisioned this phase).
