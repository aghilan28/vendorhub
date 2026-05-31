import { TaxonomyEngine } from "./engine";
import { validateTaxonomy } from "./validation";
import type { TaxonomyNodeInput } from "./types";

export interface SyntheticOptions {
  categoriesPerDepartment?: number;
  subcategoriesPerCategory?: number;
}

/**
 * Deterministically generates a valid synthetic taxonomy with exactly `categoryCount` CATEGORY
 * nodes (plus departments and optional subcategories). Used for scale certification — it produces
 * a structurally-valid tree so scale tests measure engine behaviour, not data errors.
 */
export function generateSyntheticTaxonomy(categoryCount: number, options: SyntheticOptions = {}): TaxonomyNodeInput[] {
  const perDept = options.categoriesPerDepartment ?? 25;
  const subPerCat = options.subcategoriesPerCategory ?? 0;
  const departmentCount = Math.max(1, Math.ceil(categoryCount / perDept));
  const inputs: TaxonomyNodeInput[] = [];

  let createdCategories = 0;
  for (let d = 0; d < departmentCount; d += 1) {
    const deptId = `d${d}`;
    inputs.push({ id: deptId, level: "DEPARTMENT", name: `Department ${d}`, parentId: null, sortOrder: d });
    for (let c = 0; c < perDept && createdCategories < categoryCount; c += 1) {
      const catId = `${deptId}-c${c}`;
      inputs.push({ id: catId, level: "CATEGORY", name: `Category ${d}-${c}`, parentId: deptId, sortOrder: c });
      createdCategories += 1;
      for (let s = 0; s < subPerCat; s += 1) {
        inputs.push({ id: `${catId}-s${s}`, level: "SUBCATEGORY", name: `Subcategory ${d}-${c}-${s}`, parentId: catId, sortOrder: s });
      }
    }
  }

  return inputs;
}

export interface ScaleCertificationResult {
  targetCategories: number;
  totalNodes: number;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  /** Spot-check: a known node resolves by id, slug, path; ancestors/descendants are consistent. */
  traversalOk: boolean;
  lookupOk: boolean;
  buildMs: number;
  validateMs: number;
}

/** Builds, validates, and spot-checks a synthetic taxonomy at a target category count. */
export function certifyScaleTarget(targetCategories: number, options: SyntheticOptions = {}): ScaleCertificationResult {
  const inputs = generateSyntheticTaxonomy(targetCategories, options);

  const buildStart = Date.now();
  const engine = TaxonomyEngine.fromInputs(inputs);
  const buildMs = Date.now() - buildStart;

  const validateStart = Date.now();
  const report = validateTaxonomy(engine.nodes());
  const validateMs = Date.now() - validateStart;

  // Spot-check a deterministic node in the middle of the tree.
  const sampleCategory = engine.getNode("d0-c0");
  const department = engine.getNode("d0");
  const lookupOk = Boolean(
    sampleCategory &&
      engine.getBySlug(sampleCategory.slug)?.id === sampleCategory.id &&
      engine.getByPath(sampleCategory.path)?.id === sampleCategory.id,
  );
  const traversalOk = Boolean(
    sampleCategory &&
      department &&
      engine.getParent(sampleCategory.id)?.id === department.id &&
      engine.getAncestors(sampleCategory.id).some((node) => node.id === department.id) &&
      engine.getChildren(department.id).some((node) => node.id === sampleCategory.id),
  );

  return {
    targetCategories,
    totalNodes: engine.size,
    valid: report.valid,
    errorCount: report.errorCount,
    warningCount: report.warningCount,
    traversalOk,
    lookupOk,
    buildMs,
    validateMs,
  };
}

/** Runs scale certification across the directive's target tiers. */
export function runScaleCertification(targets: number[] = [500, 1000, 5000, 10000], options: SyntheticOptions = {}): ScaleCertificationResult[] {
  return targets.map((target) => certifyScaleTarget(target, options));
}
