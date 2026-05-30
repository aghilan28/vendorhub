// Centralized HTTP security headers applied to every response via next.config.ts headers().
// Kept in a dedicated, importable module so the policy can be unit-tested and audited.
//
// Notes on the Content-Security-Policy:
//   - script-src includes 'unsafe-inline' because Next.js App Router injects inline
//     bootstrap/hydration scripts; nonce-based CSP would require custom middleware and is
//     tracked as a future hardening (out of Stage 1 scope). 'unsafe-eval' is intentionally
//     NOT included for production.
//   - External origins are limited to the services this app actually integrates with:
//     Supabase (data/auth/realtime/storage), Razorpay (checkout/payments), Sentry
//     (observability), and Unsplash (demo product imagery).

type CspDirectives = Record<string, string[]>;

const cspDirectives: CspDirectives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://*.supabase.co"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.sentry.io",
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
  ],
  "frame-src": ["'self'", "https://checkout.razorpay.com", "https://api.razorpay.com"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
};

export function buildContentSecurityPolicy(directives: CspDirectives = cspDirectives): string {
  const parts = Object.entries(directives).map(([key, values]) =>
    values.length ? `${key} ${values.join(" ")}` : key,
  );
  // upgrade-insecure-requests is a valueless directive.
  parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export const securityHeaders: ReadonlyArray<{ key: string; value: string }> = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Hyperlocal commerce may use geolocation (self); payments via Razorpay checkout.
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com"), browsing-topics=()',
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
