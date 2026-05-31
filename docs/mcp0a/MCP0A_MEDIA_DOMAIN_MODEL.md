# MCP-0A.2 — Media Domain Model

Source: `lib/media/types.ts`. All entities are typed; lifecycle, ownership and
auditability are first-class.

## Entities
| Entity | Purpose |
|--------|---------|
| MediaAsset | Central media record (status, bucket/path, metadata, hashes, quality, moderation, variants) |
| MediaVariant | A derived rendition (thumbnail/card/gallery/zoom/webp/avif) |
| MediaCollection | Ordered set of assets for an entity (e.g. a product) |
| ProductGallery / ProductGalleryItem | Buyer-facing rendered gallery |
| MediaTag / MediaCategory | Classification |
| MediaModeration | State + risk + reasons + reviewer |
| MediaAnalysis | Labels, unsafe score, dominant colors, duplicate-of |
| MediaTransformation | One audited pipeline step (validate…cdn_publish) |
| MediaAudit | Immutable lifecycle event log |
| MediaVersion | Replace history |
| MediaUsage | Where/how an asset is used |
| MediaSource | Provenance (seller_upload / bulk_import / …) |
| MediaMetadata | width/height/bytes/format/aspectRatio |
| MediaOwnership | ownerKind + ownerId + vendorId |
| MediaRights | license + attribution + expiry |
| MediaQuality | 0-100 score + sub-scores + flags |

## Lifecycle (MediaStatus)
`uploading → processing → pending_moderation → active` (or `rejected`/`failed`),
with `archived` for superseded/soft-deleted media.

## Moderation lifecycle (ModerationState)
`pending → approved | rejected | flagged | escalated` (transitions enforced by
`lib/media/moderation.ts::MODERATION_TRANSITIONS`).

## Ownership & auditability
Every asset carries `MediaOwnership`; every state change emits a `MediaAudit`
record (event, actorId, at). Persisted by the `media_audit` table.

## Persistence mapping
Engine types map to the migration tables: `media_assets`, `media_variants`,
`media_moderation`, `media_analysis`, `media_audit` (see Storage Architecture).
