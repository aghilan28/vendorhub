import fs from "node:fs";
import path from "node:path";
import { scanContent } from "./lib/secret-scan-patterns.mjs";

const root = process.cwd();
const ignored = new Set(["node_modules", ".next", "playwright-report", "test-results", ".git"]);
const fileAllowlist = new Set([".env.example"]);

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
  for (const match of scanContent(content)) {
    findings.push({ file: relative, pattern: match.pattern, line: match.line });
  }
}

if (findings.length) {
  console.error("Secret scan failed.");
  for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.pattern}`);
  process.exit(1);
}

console.log("Secret scan passed. No high-confidence secret patterns found.");
