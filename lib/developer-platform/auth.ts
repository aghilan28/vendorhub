import { createHash, randomBytes } from "crypto";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { DeveloperAuthContext, DeveloperIntegration, DeveloperScope } from "./types";

export function hashDeveloperToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeveloperToken(input: { integrationId: string; organizationId: string; now?: Date }) {
  const nonce = randomBytes(18).toString("base64url");
  const issuedAt = (input.now ?? new Date()).toISOString().slice(0, 10).replaceAll("-", "");
  return `vh_${issuedAt}_${input.organizationId.slice(0, 8)}_${input.integrationId.slice(0, 8)}_${nonce}`;
}

export function authenticateDeveloperToken(input: {
  authorizationHeader: string | null;
  integrations: DeveloperIntegration[];
  requiredScopes?: readonly DeveloperScope[];
}): DeveloperAuthContext {
  const token = input.authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AppError("AUTH_REQUIRED", "Developer API token is required.");

  const tokenHash = hashDeveloperToken(token);
  const integration = input.integrations.find((item) => item.tokenHash === tokenHash);
  if (!integration || integration.revokedAt) throw new AppError("FORBIDDEN", "Developer API token is invalid or revoked.");

  const missingScopes = (input.requiredScopes ?? []).filter((scope) => !integration.scopes.includes(scope));
  if (missingScopes.length) throw new AppError("FORBIDDEN", "Developer API token does not include the required scopes.", { missingScopes });

  const rateLimit = checkRateLimit(`developer:${integration.id}`, { limit: integration.rateLimitPerMinute, windowMs: 60_000 });
  if (!rateLimit.allowed) throw new AppError("VALIDATION_ERROR", "Developer API rate limit exceeded.", { resetAt: rateLimit.resetAt });

  return {
    integrationId: integration.id,
    organizationId: integration.organizationId,
    workspaceId: integration.workspaceId,
    vendorId: integration.vendorId,
    scopes: integration.scopes,
    rateLimitKey: `developer:${integration.id}`,
    replayKeyPrefix: createHash("sha256").update(`${integration.organizationId}:${integration.id}`).digest("hex").slice(0, 16),
  };
}

export function planTokenRotation(input: { integration: DeveloperIntegration; now?: Date }) {
  const now = input.now ?? new Date();
  const rotatedAt = input.integration.rotatedAt ? new Date(input.integration.rotatedAt) : null;
  const ageDays = rotatedAt ? Math.floor((now.getTime() - rotatedAt.getTime()) / 86_400_000) : 999;

  return {
    integrationId: input.integration.id,
    rotationRequired: ageDays > 90,
    revokeOldTokenAfterHours: 24,
    auditActions: ["record developer token rotation", "invalidate old token after overlap window", "notify integration owner"],
  };
}
