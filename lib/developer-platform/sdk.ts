import { createHash } from "crypto";
import { publicApiContracts } from "./api-governance";
import type { PublicApiVersion, SdkContract } from "./types";

export function buildTypeScriptSdkContract(version: PublicApiVersion): SdkContract {
  const contracts = publicApiContracts.filter((contract) => contract.version === version);
  const exports = [
    "VendorHubClient",
    "VendorHubApiError",
    "createWebhookVerifier",
    "createReplaySafeRequest",
    ...contracts.map((contract) => contract.id),
  ];
  const checksum = createHash("sha256").update(JSON.stringify({ version, exports, contracts })).digest("hex");

  return {
    language: "typescript",
    version,
    exports,
    checksum,
    replaySafe: contracts.every((contract) => contract.responseShape.includes("correlationId")),
  };
}

export function validateSdkCompatibility(input: { expected: SdkContract; observed: SdkContract }) {
  const missingExports = input.expected.exports.filter((item) => !input.observed.exports.includes(item));
  const checksumDrift = input.expected.checksum !== input.observed.checksum;

  return {
    compatible: missingExports.length === 0 && !checksumDrift && input.observed.replaySafe,
    missingExports,
    checksumDrift,
    actions:
      missingExports.length || checksumDrift || !input.observed.replaySafe
        ? ["block SDK release", "regenerate typed API client", "run public API contract tests"]
        : ["publish SDK artifact"],
  };
}
