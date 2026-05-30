import { describe, expect, it } from "vitest";
import { scanContent, suspiciousPatterns } from "../../scripts/lib/secret-scan-patterns.mjs";

describe("secret-scan detection patterns", () => {
  it("does NOT flag hyphenated prose that contains the 'sk-' substring (regression: risk-management)", () => {
    const benign = [
      "AI risk-management framework for trustworthy and responsible AI.",
      "https://www.nist.gov/publications/artificial-intelligence-risk-management",
      "task-management, risk-management-and-governance, disk-management",
    ].join("\n");
    expect(scanContent(benign)).toHaveLength(0);
  });

  it("flags a real-shaped OpenAI secret key", () => {
    // Synthetic 48-char alphanumeric body (not a real credential).
    const synthetic = "OPENAI_KEY = sk-" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2";
    const matches = scanContent(synthetic);
    expect(matches.some((m: { pattern: string }) => m.pattern === "OpenAI key")).toBe(true);
  });

  it("flags a project-scoped OpenAI key (sk-proj-...)", () => {
    const synthetic = "sk-proj-" + "Zz0011223344556677889900AABBCCDDEEFFGGHHII";
    expect(scanContent(synthetic).some((m: { pattern: string }) => m.pattern === "OpenAI key")).toBe(true);
  });

  it("flags Razorpay live keys and Supabase JWTs", () => {
    // Fixtures are assembled at runtime so the source file contains no contiguous
    // secret-shaped literal (which would correctly trip the scanner on this test file).
    const rzp = "rzp_live_" + "ABCDEFGHIJ1234";
    expect(scanContent(rzp).some((m: { pattern: string }) => m.pattern === "Razorpay live key")).toBe(true);
    const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "dozjgNryP4J3jVmNHl0w5N"].join(".");
    expect(scanContent(jwt).some((m: { pattern: string }) => m.pattern === "Supabase service role JWT")).toBe(true);
  });

  it("reports 1-based line numbers for auditability", () => {
    const rzp = "rzp_live_" + "ABCDEFGHIJ1234";
    const body = ["clean line", "another clean line", rzp].join("\n");
    const match = scanContent(body).find((m: { pattern: string }) => m.pattern === "Razorpay live key");
    expect(match?.line).toBe(3);
  });

  it("exposes a stable, auditable pattern set", () => {
    expect(suspiciousPatterns.map((p: { name: string }) => p.name)).toEqual([
      "Supabase service role JWT",
      "Razorpay live key",
      "OpenAI key",
      "Private env assignment",
    ]);
  });
});
