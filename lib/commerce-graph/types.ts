export type RelationshipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type RelationshipSource = 'MANUAL' | 'AI_MATCH' | 'BULK_IMPORT' | 'SYSTEM';

export interface CommerceLink {
  id: string;
  productId: string;
  storeId: string;
  sellerId: string;
  status: RelationshipStatus;
  source: RelationshipSource;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogEntry {
  storeId: string;
  products: string[];
  brands: string[];
  categories: string[];
  departments: string[];
  healthScore: number;
}
