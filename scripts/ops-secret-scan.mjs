import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".next", "playwright-report", "test-results", ".git"]);
const fileAllowlist = new Set([".env.example"]);
const suspiciousPatterns = [
  { name: "Supabase service role JWT", pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/ },
  { name: "Razorpay live key", pattern: /rzp_live_[A-Za-z0-9]{10,}/ },
  // Require a non-alphanumeric boundary before `sk-` so documentation URL slugs and words like
  // "risk-management-..." cannot trigger a false-positive OpenAI-key match.
  { name: "OpenAI key", pattern: /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/ },
  { name: "Private env assignment", pattern: /(?:SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_SECRET|OPENAI_API_KEY|PAYMENT_WEBHOOK_SECRET)=\S+/ },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const findings = [];
for (const file of walk(root)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (fileAllowlist.has(relative) || /\.(png|jpg|jpeg|webp|gif|ico|pdf|lock|tsbuildinfo)$/i.test(relative)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of suspiciousPatterns) {
    if (pattern.pattern.test(content)) findings.push({ file: relative, pattern: pattern.name });
  }
}

if (findings.length) {
  console.error("Secret scan failed.");
  for (const finding of findings) console.error(`${finding.file}: ${finding.pattern}`);
  process.exit(1);
}

console.log("Secret scan passed. No high-confidence secret patterns found.");
