import { createHash } from "crypto";
import { AppError } from "@/lib/errors";
import { globalReplayKey, resolveGlobalRegion } from "@/lib/global-infrastructure";
import type { DeveloperAuthContext, PublicApiContract, PublicApiDecision, PublicApiVersion } from "./types";
import { PUBLIC_API_VERSIONS } from "./types";

export const publicApiContracts = [
  {
    id: "orders.list",
    version: "2026-05-27",
    method: "GET",
    path: "/api/public/v1/orders",
    domain: "commerce",
    requiredScopes: ["orders:read"],
    stability: "stable",
    responseShape: ["data", "pagination", "correlationId"],
  },
  {
    id: "events.stream",
    version: "2026-05-27",
    method: "GET",
    path: "/api/public/v1/events",
    domain: "platform",
    requiredScopes: ["events:read"],
    stability: "stable",
    responseShape: ["data", "cursor", "correlationId"],
  },
  {
    id: "webhooks.register",
    version: "2026-05-27",
    method: "POST",
    path: "/api/public/v1/webhooks",
    domain: "platform",
    requiredScopes: ["webhooks:write"],
    stability: "stable",
    responseShape: ["data", "correlationId"],
  },
] as const satisfies readonly PublicApiContract[];

export function negotiatePublicApiVersion(header: string | null): PublicApiVersion {
  if (!header) return PUBLIC_API_VERSIONS[0];
  const normalized = header.trim();
  if (PUBLIC_API_VERSIONS.includes(normalized as PublicApiVersion)) return normalized as PublicApiVersion;
  throw new AppError("VALIDATION_ERROR", "Unsupported public API version.", {
    supportedVersions: [...PUBLIC_API_VERSIONS],
  });
}

export function contractForPublicApi(input: {
  method: PublicApiContract["method"];
  path: string;
  version: PublicApiVersion;
}) {
  const contract = publicApiContracts.find((item) => item.method === input.method && item.path === input.path && item.version === input.version);
  if (!contract) throw new AppError("NOT_FOUND", "Public API contract was not found.");
  return contract;
}

export function planPublicApiRequest(input: {
  contract: PublicApiContract;
  auth: DeveloperAuthContext;
  idempotencyKey?: string | null;
  requestHash?: string;
  preferredRegion?: "bom1" | "sin1" | "fra1" | "iad1";
}): PublicApiDecision {
  const routing = resolveGlobalRegion({
    request: {
      preferredRegion: input.preferredRegion,
      tenantId: input.auth.organizationId,
      domain: input.contract.domain === "platform" ? "analytics" : input.contract.domain,
      consistencyRequired: input.contract.method !== "GET",
      latencySensitive: true,
    },
  });
  const replaySeed = input.idempotencyKey ?? input.requestHash ?? createHash("sha256").update(input.contract.id).digest("hex");

  return {
    version: input.contract.version,
    contract: input.contract,
    deprecated: input.contract.stability === "deprecated",
    compatible: input.contract.responseShape.includes("correlationId"),
    replayKey: globalReplayKey(["public-api", input.auth.replayKeyPrefix, input.contract.id, replaySeed]),
    headers: {
      "VendorHub-API-Version": input.contract.version,
      "VendorHub-Region": routing.region,
      "VendorHub-Replay-Key": globalReplayKey(["public-api-header", input.contract.id, replaySeed]).slice(0, 24),
      ...(input.contract.deprecatesAt ? { "VendorHub-Deprecates-At": input.contract.deprecatesAt } : {}),
    },
    observabilityTags: [
      `platform.api.${input.contract.id}`,
      `platform.version.${input.contract.version}`,
      `platform.integration.${input.auth.integrationId}`,
      ...routing.observabilityTags,
    ],
  };
}

export function validateContractCompatibility(input: {
  previous: PublicApiContract;
  next: PublicApiContract;
}) {
  const removedFields = input.previous.responseShape.filter((field) => !input.next.responseShape.includes(field));
  const scopeExpanded = input.next.requiredScopes.some((scope) => !input.previous.requiredScopes.includes(scope));

  return {
    compatible: removedFields.length === 0 && !scopeExpanded && input.previous.method === input.next.method && input.previous.path === input.next.path,
    removedFields,
    scopeExpanded,
    actions:
      removedFields.length || scopeExpanded
        ? ["create new API version before release", "notify affected integrations", "record contract drift alert"]
        : ["ship compatible API contract"],
  };
}
