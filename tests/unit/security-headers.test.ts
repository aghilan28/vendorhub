import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

function header(key: string) {
  return securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("security headers policy", () => {
  it("includes all required hardening headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );
  });

  it("enforces HSTS for >= 2 years with subdomains and preload", () => {
    const hsts = header("Strict-Transport-Security")!;
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
    const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(63072000);
  });

  it("denies framing and MIME sniffing", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets a privacy-preserving referrer policy", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("locks down camera/microphone via Permissions-Policy", () => {
    const pp = header("Permissions-Policy")!;
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });

  it("builds a CSP that blocks objects/frame-ancestors and allows only integrated origins", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("https://checkout.razorpay.com");
    expect(csp).toContain("https://*.supabase.co");
    // Must not enable eval in the production policy.
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
