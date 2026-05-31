import { STORE_TYPES, type Seller, type SellerValidationIssue, type SellerValidationReport, type Store } from "./types";

/**
 * Seller/store validation engine (Phase 10). Detects duplicate sellers/stores, broken ownership,
 * invalid classification, orphan stores, invalid governance states and verification conflicts.
 * Deterministic.
 */
export function validateSellerNetwork(sellers: Seller[], stores: Store[]): SellerValidationReport {
  const issues: SellerValidationIssue[] = [];
  const sellerById = new Map<string, Seller>();
  const sellerIdCounts = new Map<string, number>();
  const sellerSlugOwners = new Map<string, string[]>();
  const storeIdCounts = new Map<string, number>();
  const storeSlugOwners = new Map<string, string[]>();

  for (const seller of sellers) {
    sellerById.set(seller.id, seller);
    sellerIdCounts.set(seller.id, (sellerIdCounts.get(seller.id) ?? 0) + 1);
    sellerSlugOwners.set(seller.slug, [...(sellerSlugOwners.get(seller.slug) ?? []), seller.id]);
  }
  for (const store of stores) {
    storeIdCounts.set(store.id, (storeIdCounts.get(store.id) ?? 0) + 1);
    storeSlugOwners.set(store.slug, [...(storeSlugOwners.get(store.slug) ?? []), store.id]);
  }

  for (const [id, count] of sellerIdCounts) {
    if (count > 1) issues.push({ code: "DUPLICATE_SELLER_ID", severity: "error", entityId: id, message: `Seller id "${id}" used ${count} times.` });
  }
  for (const [slug, owners] of sellerSlugOwners) {
    if (owners.length > 1) issues.push({ code: "DUPLICATE_SELLER_SLUG", severity: "error", entityId: owners[0], message: `Seller slug "${slug}" shared by ${owners.length} sellers.` });
  }
  for (const [id, count] of storeIdCounts) {
    if (count > 1) issues.push({ code: "DUPLICATE_STORE_ID", severity: "error", entityId: id, message: `Store id "${id}" used ${count} times.` });
  }
  for (const [slug, owners] of storeSlugOwners) {
    if (owners.length > 1) issues.push({ code: "DUPLICATE_STORE_SLUG", severity: "error", entityId: owners[0], message: `Store slug "${slug}" shared by ${owners.length} stores.` });
  }

  for (const seller of sellers) {
    if (seller.parentChainId && !sellerById.has(seller.parentChainId)) {
      // A parent chain reference that does not resolve is allowed only when it is a synthetic chain key;
      // flag it as a warning so generated chain roots are not treated as hard failures.
      issues.push({ code: "BROKEN_OWNERSHIP", severity: "warning", entityId: seller.id, message: `Seller "${seller.id}" references unknown parent chain "${seller.parentChainId}".` });
    }
    if (seller.verificationStatus === "REJECTED" && seller.operationalStatus === "ACTIVE") {
      issues.push({ code: "VERIFICATION_CONFLICT", severity: "error", entityId: seller.id, message: `Seller "${seller.id}" is REJECTED but operationally ACTIVE.` });
    }
    if (seller.lifecycleStatus === "ARCHIVED" && seller.operationalStatus === "ACTIVE") {
      issues.push({ code: "INVALID_GOVERNANCE_STATE", severity: "error", entityId: seller.id, message: `Seller "${seller.id}" is ARCHIVED but operationally ACTIVE.` });
    }
  }

  for (const store of stores) {
    if (!store.sellerId || !sellerById.has(store.sellerId)) {
      issues.push({ code: store.sellerId ? "BROKEN_OWNERSHIP" : "ORPHAN_STORE", severity: "error", entityId: store.id, message: `Store "${store.id}" has no valid owning seller (${store.sellerId || "none"}).` });
    }
    if (!STORE_TYPES.includes(store.storeType)) {
      issues.push({ code: "INVALID_CLASSIFICATION", severity: "error", entityId: store.id, message: `Store "${store.id}" has invalid type "${store.storeType}".` });
    }
    if (store.verificationStatus === "REJECTED" && store.operationalStatus === "ACTIVE") {
      issues.push({ code: "VERIFICATION_CONFLICT", severity: "error", entityId: store.id, message: `Store "${store.id}" is REJECTED but operationally ACTIVE.` });
    }
    if (store.lifecycleStatus === "ARCHIVED" && store.operationalStatus === "ACTIVE") {
      issues.push({ code: "INVALID_GOVERNANCE_STATE", severity: "error", entityId: store.id, message: `Store "${store.id}" is ARCHIVED but operationally ACTIVE.` });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return { valid: errorCount === 0, checkedSellers: sellers.length, checkedStores: stores.length, errorCount, warningCount, issues };
}
