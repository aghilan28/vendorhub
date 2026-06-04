export interface Brand { id: string; slug: string; name: string; metadata: any; }
export interface Category { id: string; slug: string; name: string; department_id: string; }
export interface ProductFamily { id: string; slug: string; name: string; category_id: string; }
export interface GeneratedProduct { id: string; name: string; slug: string; brand_id: string; category_id: string; description: string; status: 'ACTIVE'; unit: string; package_size: string; image_url: string; search_terms: string[]; vendor_id: string; base_price: number; }
