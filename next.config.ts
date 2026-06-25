import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Stage 1 (R-M1): type errors must fail the build. `npm run typecheck` is clean,
    // so this makes the build gate enforce what CI already verifies.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "assets.vendorhub.in" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    return [
      {
        // Apply hardened security headers to every route.
        source: "/:path*",
        headers: securityHeaders.map((header) => ({ key: header.key, value: header.value })),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
});
