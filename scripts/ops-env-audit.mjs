import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const environments = JSON.parse(fs.readFileSync(path.join(root, "config", "environments.json"), "utf8"));
const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
];

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const missingFromExample = requiredEnv.filter((key) => !envExample.includes(`${key}=`));
const invalidEnvironment = Object.entries(environments).filter(([, value]) => {
  return !value.supabaseProjectRef || !value.vercelTarget || !Array.isArray(value.storageBuckets) || value.storageBuckets.length < 3;
});
const refs = new Map();
const telemetryScopes = new Map();
const isolationFailures = [];

for (const [name, value] of Object.entries(environments)) {
  if (refs.has(value.supabaseProjectRef)) isolationFailures.push(`${name} shares Supabase project ref with ${refs.get(value.supabaseProjectRef)}`);
  refs.set(value.supabaseProjectRef, name);

  if (telemetryScopes.has(value.telemetryScope)) isolationFailures.push(`${name} shares telemetry scope with ${telemetryScopes.get(value.telemetryScope)}`);
  telemetryScopes.set(value.telemetryScope, name);

  if (name !== "production" && value.allowsProductionSecrets) isolationFailures.push(`${name} allows production secrets`);
  if (name === "production" && !value.allowsProductionSecrets) isolationFailures.push("production does not allow production secrets");
}

const allowedPublicMirrors = new Set(["RAZORPAY_KEY_ID"]);
const privateEnvLeakedPublicly = requiredEnv.filter((key) => !key.startsWith("NEXT_PUBLIC_") && !allowedPublicMirrors.has(key) && envExample.includes(`NEXT_PUBLIC_${key}=`));

if (missingFromExample.length || invalidEnvironment.length || isolationFailures.length || privateEnvLeakedPublicly.length) {
  console.error("Environment audit failed.");
  if (missingFromExample.length) console.error(`Missing .env.example keys: ${missingFromExample.join(", ")}`);
  if (invalidEnvironment.length) console.error(`Invalid environment definitions: ${invalidEnvironment.map(([key]) => key).join(", ")}`);
  if (isolationFailures.length) console.error(`Environment isolation failures: ${isolationFailures.join("; ")}`);
  if (privateEnvLeakedPublicly.length) console.error(`Private env keys exposed as public: ${privateEnvLeakedPublicly.join(", ")}`);
  process.exit(1);
}

console.log(`Environment audit passed for ${Object.keys(environments).join(", ")}.`);
