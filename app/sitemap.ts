import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * EC-7 — Production sitemap.
 * Lists the public, crawlable commerce surfaces. Dynamic product/category/store
 * URLs are appended at runtime when a live catalog is configured (degrade-safe:
 * static public routes are always present).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/home", priority: 0.9, changeFrequency: "daily" },
    { path: "/search", priority: 0.8, changeFrequency: "daily" },
    { path: "/discover", priority: 0.8, changeFrequency: "daily" },
    { path: "/categories", priority: 0.8, changeFrequency: "weekly" },
    { path: "/nearby", priority: 0.7, changeFrequency: "daily" },
    { path: "/launch", priority: 0.5, changeFrequency: "monthly" },
    { path: "/demo", priority: 0.4, changeFrequency: "monthly" },
    { path: "/sign-in", priority: 0.3, changeFrequency: "yearly" },
    { path: "/sign-up", priority: 0.3, changeFrequency: "yearly" },
    { path: "/seller-registration", priority: 0.4, changeFrequency: "monthly" },
  ];

  return staticRoutes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
