import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adminNavigation, buyerNavigation, buyerQuickActions, sellerNavigation } from "@/lib/constants/navigation";

// MCP-0G.6 — Navigation Certification.
// Scans the real app/ directory to build the set of static routes, then asserts
// every navigation href resolves to an existing route (no dead routes), contains
// no "-placeholder" stubs, and has no duplicates (no orphan/duplicate routes).

const APP_DIR = join(process.cwd(), "app");

const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

function collectRoutes(dir: string, segments: string[], out: Set<string>): void {
  if (!existsSync(dir)) return;
  const names = readdirSync(dir);
  if (PAGE_FILES.some((file) => names.includes(file))) {
    const route = "/" + segments.filter(Boolean).join("/");
    out.add(route === "/" ? "/" : route.replace(/\/+$/, ""));
  }
  for (const name of names) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name.startsWith("(") && name.endsWith(")")) {
      // route group — does not contribute a path segment
      collectRoutes(full, segments, out);
    } else if (name.startsWith("@")) {
      // parallel route slot — skip
      continue;
    } else {
      collectRoutes(full, [...segments, name], out);
    }
  }
}

const ROUTES = (() => {
  const set = new Set<string>();
  collectRoutes(APP_DIR, [], set);
  return set;
})();

/** Does a nav href (static, no query) resolve to a real route? */
function resolves(href: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  if (ROUTES.has(path)) return true;
  // tolerate a single dynamic segment match (none expected in nav, but safe)
  for (const route of ROUTES) {
    if (!route.includes("[")) continue;
    const r = route.split("/");
    const p = path.split("/");
    if (r.length !== p.length) continue;
    if (r.every((seg, i) => seg.startsWith("[") || seg === p[i])) return true;
  }
  return false;
}

const ALL_NAVS = {
  buyerNavigation,
  sellerNavigation,
  adminNavigation,
  buyerQuickActions,
} as const;

describe("MCP-0G.6 navigation certification", () => {
  it("discovered the real app routes", () => {
    expect(ROUTES.size).toBeGreaterThan(30);
    expect(ROUTES.has("/")).toBe(true);
    expect(ROUTES.has("/seller/fulfillment")).toBe(true);
    expect(ROUTES.has("/admin/commerce")).toBe(true);
  });

  for (const [name, nav] of Object.entries(ALL_NAVS)) {
    describe(name, () => {
      it("has no dead routes (every href resolves)", () => {
        const dead = nav.filter((item) => !resolves(item.href)).map((item) => item.href);
        expect(dead).toEqual([]);
      });

      it("contains no -placeholder routes", () => {
        const placeholders = nav.filter((item) => item.href.includes("placeholder")).map((item) => item.href);
        expect(placeholders).toEqual([]);
      });

      it("has no duplicate hrefs", () => {
        const hrefs = nav.map((item) => item.href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
      });
    });
  }

  it("no app route is a -placeholder route (orphans removed)", () => {
    const placeholderRoutes = [...ROUTES].filter((r) => r.includes("placeholder"));
    expect(placeholderRoutes).toEqual([]);
  });

  it("the consolidated clean routes exist", () => {
    expect(ROUTES.has("/seller/payouts")).toBe(true);
    expect(ROUTES.has("/seller/support")).toBe(true);
    expect(ROUTES.has("/admin/platform-health")).toBe(true);
  });
});
