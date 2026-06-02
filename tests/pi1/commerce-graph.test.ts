import { describe, expect, it } from 'vitest';
import { RelationshipEngine } from '../../lib/commerce-graph/link-engine';
import { StoreCatalogEngine } from '../../lib/commerce-graph/catalog-engine';
import { DistributionEngine } from '../../lib/commerce-graph/distribution-engine';
import { ValidationEngine } from '../../lib/commerce-graph/governance-engine';

describe('Commerce Graph Engines', () => {
  const productId = 'p1';
  const storeId = 's1';
  const sellerId = 'sel1';

  it('creates and validates a link', () => {
    const link = RelationshipEngine.createLink(productId, storeId, sellerId);
    expect(link.productId).toBe(productId);
    expect(ValidationEngine.validate(link).valid).toBe(true);
  });

  it('generates store catalog', () => {
    const links = [RelationshipEngine.createLink(productId, storeId, sellerId)];
    const catalog = StoreCatalogEngine.generateCatalog(storeId, links);
    expect(catalog.products).toContain(productId);
  });

  it('analyzes distribution', () => {
    const links = [
      RelationshipEngine.createLink(productId, 's1', sellerId),
      RelationshipEngine.createLink(productId, 's2', sellerId),
    ];
    const analysis = DistributionEngine.analyzeDistribution(productId, links);
    expect(analysis.storeCount).toBe(2);
  });
});
