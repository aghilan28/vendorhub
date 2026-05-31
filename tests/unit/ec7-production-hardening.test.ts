/**
 * EC-7 — Production Hardening verification.
 * Locks in the config-level production fixes so they cannot silently regress:
 *  - security headers configured in next.config
 *  - build type-checking enabled (ignoreBuildErrors = false)
 *  - the demo/QA auth bypass can never trigger in production
 *  - SEO primitives (robots, sitemap) exist and are well-formed
 *  - vercel cron wired for the async worker
 * Pure file/inspection assertions — no new features.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("EC-7 next.config security + build hardening", () => {
  const cfg = read("next.config.ts");

  it("enables build type-checking (ignoreBuildErrors: false)", () => {
    expect(cfg).toMatch(/ignoreBuildErrors:\s*false/);
    expect(cfg).not.toMatch(/ignoreBuildErrors:\s*true/);
  });

  it("declares a headers() function", () => {
    expect(cfg).toMatch(/async headers\(\)/);
  });

  it("includes the core production security headers", () => {
    for (const header of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Content-Security-Policy",
      "Permissions-Policy",
    ]) {
      expect(cfg).toContain(header);
    }
  });

  it("CSP restricts object-src and frame-ancestors", () => {
    expect(cfg).toContain("object-src 'none'");
    expect(cfg).toContain("frame-ancestors 'self'");
  });
});

describe("EC-7 middleware auth-bypass hardening", () => {
  const mw = read("middleware.ts");

  it("guards the demo bypass behind NODE_ENV !== production", () => {
    expect(mw).toMatch(/NODE_ENV\s*!==\s*"production"/);
  });

  it("does not allow an unconditional uiQa bypass", () => {
    // The bypass must be ANDed with a non-production guard, never standalone.
    const hasStandaloneBypass = /const allowDemoProtectedRoutes\s*=\s*\n?\s*process\.env\.NODE_ENV\s*===\s*"development"\s*\|\|\s*request\.nextUrl\.searchParams\.get\("uiQa"\)\s*===\s*"1";/.test(mw);
    expect(hasStandaloneBypass).toBe(false);
  });
});

describe("EC-7 SEO primitives", () => {
  it("robots.ts and sitemap.ts exist", () => {
    expect(existsSync(resolve(root, "app/robots.ts"))).toBe(true);
    expect(existsSync(resolve(root, "app/sitemap.ts"))).toBe(true);
  });

  it("robots disallows protected areas and points to the sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = (rule?.disallow ?? []) as string[];
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/seller", "/api", "/checkout"]));
    expect(r.sitemap).toMatch(/sitemap\.xml$/);
  });

  it("sitemap lists public commerce routes with valid priorities", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(5);
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/search"))).toBe(true);
    for (const e of entries) {
      expect(e.priority).toBeGreaterThan(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });
});

describe("EC-7 deployment config", () => {
  it("vercel.json wires a cron for the async worker", () => {
    const vercel = JSON.parse(read("vercel.json")) as { crons?: Array<{ path: string; schedule: string }> };
    expect(Array.isArray(vercel.crons)).toBe(true);
    expect(vercel.crons!.some((c) => c.path === "/api/worker")).toBe(true);
  });

  it("worker route enforces cron authorization in production", () => {
    const worker = read("app/api/ops/async/worker/route.ts");
    expect(worker).toMatch(/isAuthorized/);
    expect(worker).toMatch(/cronSecret/);
  });
});
