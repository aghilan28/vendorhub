import { STORE_CATEGORY_HIERARCHY } from "./category";
import {
  CAPABILITY_FLAGS,
  STORE_CATEGORY_L1,
  STORE_FORMAT_TYPES,
  type ClassificationValidationIssue,
  type ClassificationValidationReport,
  type StoreClassificationProfile,
} from "./types";

export interface ClassificationValidationOptions {
  /** When provided, profiles whose storeId is absent are flagged as orphan records. */
  validStoreIds?: Set<string>;
}

/**
 * Store-classification validation engine (Phase 10). Detects invalid categories/types/capabilities,
 * broken/orphan assignments, conflicting capabilities, compliance violations and classification
 * errors. Deterministic.
 */
export function validateClassification(profiles: StoreClassificationProfile[], options: ClassificationValidationOptions = {}): ClassificationValidationReport {
  const issues: ClassificationValidationIssue[] = [];
  const idCounts = new Map<string, number>();

  for (const profile of profiles) {
    idCounts.set(profile.storeId, (idCounts.get(profile.storeId) ?? 0) + 1);

    if (!STORE_CATEGORY_L1.includes(profile.categoryL1)) {
      issues.push({ code: "INVALID_CATEGORY", severity: "error", entityId: profile.storeId, message: `Invalid L1 category "${profile.categoryL1}".` });
    } else if (!(STORE_CATEGORY_HIERARCHY[profile.categoryL1] ?? []).includes(profile.categoryL2)) {
      issues.push({ code: "INVALID_CATEGORY", severity: "error", entityId: profile.storeId, message: `L2 "${profile.categoryL2}" is not under L1 "${profile.categoryL1}".` });
    }

    if (!STORE_FORMAT_TYPES.includes(profile.formatType)) {
      issues.push({ code: "INVALID_TYPE", severity: "error", entityId: profile.storeId, message: `Invalid store-format type "${profile.formatType}".` });
    }

    for (const flag of CAPABILITY_FLAGS) {
      if (typeof profile.capabilities[flag] !== "boolean") {
        issues.push({ code: "INVALID_CAPABILITY", severity: "error", entityId: profile.storeId, message: `Capability "${flag}" missing on store "${profile.storeId}".` });
      }
    }

    if (profile.capabilities.instantDelivery && !profile.capabilities.delivery) {
      issues.push({ code: "CONFLICTING_CAPABILITY", severity: "error", entityId: profile.storeId, message: `Store "${profile.storeId}" supports instant delivery without delivery.` });
    }
    if (profile.capabilities.sameDay && !profile.capabilities.delivery) {
      issues.push({ code: "CONFLICTING_CAPABILITY", severity: "error", entityId: profile.storeId, message: `Store "${profile.storeId}" supports same-day without delivery.` });
    }
    if (profile.capabilities.hyperlocal && !profile.capabilities.delivery) {
      issues.push({ code: "CONFLICTING_CAPABILITY", severity: "error", entityId: profile.storeId, message: `Store "${profile.storeId}" supports hyperlocal without delivery.` });
    }

    if (!profile.sellerId) {
      issues.push({ code: "BROKEN_ASSIGNMENT", severity: "error", entityId: profile.storeId, message: `Profile "${profile.storeId}" has no owning seller.` });
    }
    if (options.validStoreIds && !options.validStoreIds.has(profile.storeId)) {
      issues.push({ code: "ORPHAN_RECORD", severity: "error", entityId: profile.storeId, message: `Profile references unknown store "${profile.storeId}".` });
    }

    if (profile.productCapability.allowedDepartments.includes("medicine") && !profile.productCapability.complianceRequirements.includes("drug_license")) {
      issues.push({ code: "COMPLIANCE_VIOLATION", severity: "error", entityId: profile.storeId, message: `Store "${profile.storeId}" sells medicine without a drug licence.` });
    }
    if (profile.productCapability.restrictedDepartments.some((dept) => profile.productCapability.allowedDepartments.includes(dept))) {
      issues.push({ code: "CLASSIFICATION_ERROR", severity: "error", entityId: profile.storeId, message: `Store "${profile.storeId}" has a department both allowed and restricted.` });
    }
  }

  for (const [id, count] of idCounts) {
    if (count > 1) issues.push({ code: "CLASSIFICATION_ERROR", severity: "error", entityId: id, message: `Store "${id}" has ${count} classification profiles.` });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return { valid: errorCount === 0, checkedProfiles: profiles.length, errorCount, warningCount, issues };
}
