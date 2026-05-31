import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

function supabaseStorageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const storageHost = supabaseStorageHost();

// EC-7 — Production security headers applied to every response.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline'",
      // Next.js requires inline/eval for hydration + framework runtime.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https: wss:",
      "form-action 'self'",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // EC-7: build-time type errors are no longer ignored (typecheck must pass).
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage public objects (MCP-0A media pipeline).
      ...(storageHost
        ? [{ protocol: "https" as const, hostname: storageHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Allow any Supabase project storage host in non-configured environments.
      { protocol: "https" as const, hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https" as const, hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
});
