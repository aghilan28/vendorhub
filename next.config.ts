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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
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
