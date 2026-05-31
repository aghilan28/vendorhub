import { createDeterministicClock, slugify } from "@/lib/taxonomy";
import { UniqueRegistry, buildVariantAxisCode, generateInternalSku } from "./sku";
import type {
  Clock,
  PackagingSpec,
  ProductMaster,
  ProductMasterInput,
  ProductStatus,
  ProductVariant,
  ProductVariantInput,
} from "./types";

export interface ProductEngineOptions {
  clock?: Clock;
}

const DEFAULT_PACKAGING: PackagingSpec = { level: "UNIT", baseUnit: "unit", baseQuantity: 1, unitsPerPack: 1 };

function resolveVariant(
  input: ProductVariantInput,
  context: { productId: string; departmentId: string; brandId: string | null },
  index: number,
  clock: Clock,
): ProductVariant {
  const axes = { ...(input.axes ?? {}) };
  const slug = input.slug ?? slugify(input.name);
  const variantKey = Object.keys(axes).length ? buildVariantAxisCode(axes) : slug;
  const id = input.id ?? `${context.productId}--${slug}`;
  const internalSku =
    input.internalSku ??
    generateInternalSku({ departmentId: context.departmentId, brandId: context.brandId, productId: context.productId, variantKey });
  const now = clock();
  return {
    id,
    productId: context.productId,
    name: input.name,
    slug,
    axes,
    internalSku,
    identifiers: { ...(input.identifiers ?? {}) },
    packaging: { ...DEFAULT_PACKAGING, ...(input.packaging ?? {}) },
    attributes: { ...(input.attributes ?? {}) },
    sortOrder: input.sortOrder ?? index,
    status: input.status ?? "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveProducts(inputs: ProductMasterInput[], clock: Clock = createDeterministicClock()): ProductMaster[] {
  return inputs.map((input) => {
    const slug = input.slug ?? slugify(input.name);
    const id = input.id ?? slug;
    const brandId = input.brandId ?? null;
    const now = clock();
    const status = input.status ?? "ACTIVE";
    const variants = (input.variants ?? []).map((variant, index) =>
      resolveVariant(variant, { productId: id, departmentId: input.departmentId, brandId }, index, clock),
    );
    return {
      id,
      name: input.name,
      slug,
      description: input.description ?? "",
      brandId,
      departmentId: input.departmentId,
      categoryId: input.categoryId ?? null,
      familyId: input.familyId ?? null,
      typeId: input.typeId ?? null,
      status,
      lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
      version: 1,
      attributes: { ...(input.attributes ?? {}) },
      localizedNames: { ...(input.localizedNames ?? {}) },
      variants,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mergedIntoId: null,
      metadata: { ...(input.metadata ?? {}) },
    };
  });
}

export interface SkuLookupResult {
  product: ProductMaster;
  variant: ProductVariant;
}

/** Indexed, read-optimized view over product masters, their variants, and SKU/barcode registries. */
export class ProductEngine {
  private readonly byId = new Map<string, ProductMaster>();
  private readonly bySlug = new Map<string, string>();
  private readonly productsByBrand = new Map<string, string[]>();
  private readonly productsByDepartment = new Map<string, string[]>();
  private readonly variantOwner = new Map<string, string>();
  private readonly skuRegistry = new UniqueRegistry("sku");
  private readonly barcodeRegistry = new UniqueRegistry("barcode");
  private readonly skuToVariant = new Map<string, string>();
  private readonly barcodeToVariant = new Map<string, string>();
  private readonly productsList: ProductMaster[];
  private variantCount = 0;

  constructor(products: ProductMaster[]) {
    this.productsList = [...products].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    for (const product of this.productsList) {
      this.byId.set(product.id, product);
      this.bySlug.set(product.slug, product.id);
      if (product.brandId) {
        const bucket = this.productsByBrand.get(product.brandId) ?? [];
        bucket.push(product.id);
        this.productsByBrand.set(product.brandId, bucket);
      }
      const deptBucket = this.productsByDepartment.get(product.departmentId) ?? [];
      deptBucket.push(product.id);
      this.productsByDepartment.set(product.departmentId, deptBucket);

      for (const variant of product.variants) {
        this.variantCount += 1;
        this.variantOwner.set(variant.id, product.id);
        for (const sku of this.skuValues(variant)) {
          this.skuRegistry.register(sku, variant.id);
          if (!this.skuToVariant.has(sku)) this.skuToVariant.set(sku, variant.id);
        }
        for (const barcode of this.barcodeValues(variant)) {
          this.barcodeRegistry.register(barcode, variant.id);
          if (!this.barcodeToVariant.has(barcode)) this.barcodeToVariant.set(barcode, variant.id);
        }
      }
    }
  }

  static fromInputs(inputs: ProductMasterInput[], options: ProductEngineOptions = {}): ProductEngine {
    return new ProductEngine(resolveProducts(inputs, options.clock ?? createDeterministicClock()));
  }

  private skuValues(variant: ProductVariant): string[] {
    return [variant.internalSku, variant.identifiers.vendorSku, variant.identifiers.marketplaceSku, variant.identifiers.supplierSku].filter(
      (value): value is string => Boolean(value),
    );
  }

  private barcodeValues(variant: ProductVariant): string[] {
    return [variant.identifiers.barcode, variant.identifiers.upc, variant.identifiers.ean, variant.identifiers.gtin].filter(
      (value): value is string => Boolean(value),
    );
  }

  get productCount(): number {
    return this.productsList.length;
  }

  get totalVariants(): number {
    return this.variantCount;
  }

  get skuRegistrySize(): number {
    return this.skuRegistry.size;
  }

  get barcodeRegistrySize(): number {
    return this.barcodeRegistry.size;
  }

  products(): ProductMaster[] {
    return [...this.productsList];
  }

  getProduct(id: string): ProductMaster | undefined {
    return this.byId.get(id);
  }

  getProductBySlug(slug: string): ProductMaster | undefined {
    const id = this.bySlug.get(slug);
    return id ? this.byId.get(id) : undefined;
  }

  getVariant(variantId: string): ProductVariant | undefined {
    const productId = this.variantOwner.get(variantId);
    if (!productId) return undefined;
    return this.byId.get(productId)?.variants.find((variant) => variant.id === variantId);
  }

  getVariantsByProduct(productId: string): ProductVariant[] {
    return this.byId.get(productId)?.variants ?? [];
  }

  getProductsByBrand(brandId: string): ProductMaster[] {
    return (this.productsByBrand.get(brandId) ?? []).map((id) => this.byId.get(id) as ProductMaster);
  }

  getProductsByDepartment(departmentId: string): ProductMaster[] {
    return (this.productsByDepartment.get(departmentId) ?? []).map((id) => this.byId.get(id) as ProductMaster);
  }

  getBySku(sku: string): SkuLookupResult | undefined {
    const variantId = this.skuToVariant.get(sku);
    if (!variantId) return undefined;
    const productId = this.variantOwner.get(variantId);
    const product = productId ? this.byId.get(productId) : undefined;
    const variant = product?.variants.find((v) => v.id === variantId);
    return product && variant ? { product, variant } : undefined;
  }

  getByBarcode(barcode: string): SkuLookupResult | undefined {
    const variantId = this.barcodeToVariant.get(barcode);
    if (!variantId) return undefined;
    const productId = this.variantOwner.get(variantId);
    const product = productId ? this.byId.get(productId) : undefined;
    const variant = product?.variants.find((v) => v.id === variantId);
    return product && variant ? { product, variant } : undefined;
  }

  skuCollisions() {
    return this.skuRegistry.getCollisions();
  }

  barcodeCollisions() {
    return this.barcodeRegistry.getCollisions();
  }

  stats(): { products: number; variants: number; skus: number; barcodes: number; byStatus: Record<ProductStatus, number>; byDepartment: Record<string, number> } {
    const byStatus = { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0, MERGED: 0, SPLIT: 0 } as Record<ProductStatus, number>;
    const byDepartment: Record<string, number> = {};
    for (const product of this.productsList) {
      byStatus[product.status] += 1;
      byDepartment[product.departmentId] = (byDepartment[product.departmentId] ?? 0) + 1;
    }
    return { products: this.productsList.length, variants: this.variantCount, skus: this.skuRegistry.size, barcodes: this.barcodeRegistry.size, byStatus, byDepartment };
  }
}
