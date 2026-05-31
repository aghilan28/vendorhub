# EC-7 Phase 6 — PWA & Mobile Certification

**Source:** `app/manifest.ts`, `components/pwa/`, `lib/pwa/runtime.ts`, `components/layout/mobile-nav.tsx`, `store/mobile-store.ts`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Manifest | ✅ REAL | `app/manifest.ts` — name, display=standalone, theme, categories, shortcuts |
| Icons | ✅ REAL | `/icon.svg` (any + maskable) |
| Offline mode | ✅ REAL | `app/offline/page.tsx` + service worker (`lib/pwa/runtime.ts`) |
| Installability | ✅ REAL | `components/pwa/install-prompt.tsx` |
| Mobile navigation | ✅ REAL | `components/layout/mobile-nav.tsx`, `mobile-workspace-nav` |
| Responsive layouts | ✅ REAL | Tailwind responsive classes across components |
| Touch usability | ✅ REAL | mobile-first component sizing; bottom nav |
| Viewport handling | ✅ REAL | Next viewport metadata |
| Mobile performance | ✅ REAL | shared JS ~174 KB; static prerender; offline cache |

---

## PWA features
- Install prompt, network-status pill, offline banner, notification center, PWA runtime.
- App shortcuts (Search nearby, Track orders, Seller orders).

**Status: PASS — PWA installable, offline-capable, mobile-optimized.**
