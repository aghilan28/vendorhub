# VendorHub Phase 9 Deployment Launch Certification

VendorHub is certified for a demo-safe production deployment path when the checks in this document pass.

## Deployment Target

- Frontend: Vercel
- Backend: Supabase
- Runtime region: Mumbai (`bom1`)
- Build command: `npm run build`
- Install command: `npm ci`

## Required Vercel Environment Variables

Configure these in Vercel Project Settings before promoting a production deployment:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_SECRET
```

Only `NEXT_PUBLIC_*` values are browser-visible. Service role, OpenAI, and Razorpay secrets must remain server-side only.

## Launch Verification Commands

Run before demo or production handoff:

```bash
npm run typecheck
npm run lint
npm run build
```

Then verify runtime readiness:

```bash
curl /api/health
curl /api/readiness
```

Expected health status:

```json
{
  "service": "vendorhub-web",
  "phase": "9-launch-certification",
  "status": "ok",
  "mode": "demo-safe"
}
```

`/api/readiness` must expose missing environment gates instead of failing silently. In demo-safe mode, fallback data, resilient navigation, local realtime simulation, semantic-to-fuzzy search fallback, and demo accounts remain available.

## Demo Safety Gates

- Buyer route: search -> PDP -> cart -> checkout -> orders
- Seller route: dashboard -> products -> inventory -> fulfillment
- Admin route: moderation -> approvals -> governance -> oversight
- Critical support routes: `/demo`, `/launch`, `/api/health`, `/api/readiness`
- Fallback states: global error boundary, route error boundaries, not-found recovery, image fallback, search fallback, realtime fallback

## Release Criteria

A VendorHub deployment is launch-certified when:

- TypeScript, lint, and production build pass.
- `/api/health` returns `ok`.
- `/api/readiness` returns either `production-ready` or an explicit `demo-safe` status with missing gates listed.
- No source or config references retired branding.
- Vercel has all production variables configured without exposing private secrets.
- Demo accounts and seeded ecosystem data are available.
