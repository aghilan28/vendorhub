import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * EC-7 — Production robots.txt.
 * Allows crawling of public commerce surfaces; blocks authenticated/admin/seller/api areas.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/seller", "/api", "/checkout", "/cart", "/profile", "/orders", "/wishlist", "/disputes", "/support"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
