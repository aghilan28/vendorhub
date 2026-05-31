import { AttributeRegistry } from "@/lib/taxonomy";
import type {
  AttributeMap,
  InheritanceConflict,
  InheritanceScope,
  ResolvedProductAttribute,
} from "./types";

/** Attribute value layers, lowest precedence (GLOBAL) to highest (VARIANT). */
export interface InheritanceLayers {
  global?: AttributeMap;
  taxonomy?: AttributeMap;
  brand?: AttributeMap;
  product?: AttributeMap;
  variant?: AttributeMap;
}

export interface InheritanceOptions {
  /** PP-1 attribute registry, used to validate keys and enum values. */
  registry?: AttributeRegistry;
  /** Keys that must not be overridden by a higher scope (e.g. prescription_required). */
  lockedKeys?: string[];
}

const SCOPE_ORDER: { scope: InheritanceScope; field: keyof InheritanceLayers }[] = [
  { scope: "GLOBAL", field: "global" },
  { scope: "TAXONOMY", field: "taxonomy" },
  { scope: "BRAND", field: "brand" },
  { scope: "PRODUCT", field: "product" },
  { scope: "VARIANT", field: "variant" },
];

export interface InheritanceResult {
  resolved: ResolvedProductAttribute[];
  conflicts: InheritanceConflict[];
}

/**
 * Resolves the effective attribute set for a product/variant across the GLOBAL → TAXONOMY → BRAND →
 * PRODUCT → VARIANT scopes (Phase 6). Nearest (highest-precedence) scope wins; overridden values are
 * recorded. Detects unknown attributes, invalid enum values, and locked-key override conflicts.
 */
export function resolveInheritance(layers: InheritanceLayers, options: InheritanceOptions = {}): InheritanceResult {
  const registry = options.registry;
  const locked = new Set(options.lockedKeys ?? []);
  const conflicts: InheritanceConflict[] = [];

  // Collect, per key, the ordered list of (scope, value) contributions.
  const contributions = new Map<string, { scope: InheritanceScope; value: ResolvedProductAttribute["value"] }[]>();
  for (const { scope, field } of SCOPE_ORDER) {
    const map = layers[field];
    if (!map) continue;
    for (const [key, value] of Object.entries(map)) {
      const list = contributions.get(key) ?? [];
      list.push({ scope, value });
      contributions.set(key, list);
    }
  }

  const resolved: ResolvedProductAttribute[] = [];
  for (const [key, list] of contributions) {
    const winner = list[list.length - 1];
    const overridden = list.slice(0, -1);
    resolved.push({ key, value: winner.value, scope: winner.scope, overridden });

    if (registry) {
      const definition = registry.get(key);
      if (!definition) {
        conflicts.push({ key, reason: "UNKNOWN_ATTRIBUTE", scope: winner.scope });
      } else if (definition.dataType === "enum" && definition.allowedValues && !definition.allowedValues.includes(String(winner.value))) {
        conflicts.push({ key, reason: "INVALID_ENUM_VALUE", scope: winner.scope, detail: { value: winner.value, allowed: definition.allowedValues } });
      }
    }

    // Locked keys may not be overridden by a higher scope than the one that first set them.
    if (locked.has(key) && list.length > 1) {
      conflicts.push({ key, reason: "LOCKED_OVERRIDE", scope: winner.scope, detail: { definedAt: list.map((entry) => entry.scope) } });
    }
  }

  resolved.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { resolved, conflicts };
}

/** Flattens a resolved inheritance result back into a plain attribute map. */
export function flattenResolved(resolved: ResolvedProductAttribute[]): AttributeMap {
  const map: AttributeMap = {};
  for (const attribute of resolved) map[attribute.key] = attribute.value;
  return map;
}
