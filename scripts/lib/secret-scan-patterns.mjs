// Deterministic, auditable secret-detection patterns shared by the CI secret scanner
// and its unit tests. Each pattern is tuned to minimise false positives while still
// catching real, high-confidence credential shapes.
//
// History: the original OpenAI pattern /sk-[A-Za-z0-9_-]{20,}/ produced a CI-blocking
// false positive by matching the substring "sk-management..." inside hyphenated slugs
// such as "risk-management-framework". The corrected pattern below:
//   - anchors on a word boundary (\b) so it cannot match inside "risk-",
//   - forbids "-" in the key body so hyphenated prose/slugs cannot chain into a match,
//   - requires >= 32 body characters (real OpenAI keys are ~48+), and
//   - supports project keys (sk-proj-...).

export const suspiciousPatterns = [
  {
    name: "Supabase service role JWT",
    pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  },
  {
    name: "Razorpay live key",
    pattern: /\brzp_live_[A-Za-z0-9]{10,}\b/,
  },
  {
    name: "OpenAI key",
    // sk-XXXX or sk-proj-XXXX, alphanumeric body only, >=32 chars, word-boundary anchored.
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/,
  },
  {
    name: "Private env assignment",
    pattern: /(?:SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_SECRET|RAZORPAY_KEY_SECRET|OPENAI_API_KEY|PAYMENT_WEBHOOK_SECRET)=["']?[A-Za-z0-9_\-./+]{12,}/,
  },
];

// Scan a single text body and return all matches with 1-based line numbers.
export function scanContent(content) {
  const lines = content.split(/\r?\n/);
  const matches = [];
  for (const { name, pattern } of suspiciousPatterns) {
    for (let i = 0; i < lines.length; i += 1) {
      // Use a fresh, non-global regex test per line for determinism.
      if (pattern.test(lines[i])) {
        matches.push({ pattern: name, line: i + 1 });
      }
    }
  }
  return matches;
}
