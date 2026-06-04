import { ProductGenerationEngine } from '../lib/product-universe/ProductGenerationEngine';
import * as fs from 'fs';
import * as path from 'path';
async function main() {
  const products = ProductGenerationEngine.generateUniverse();
  let sql = '-- PP-C PRODUCT UNIVERSE POPULATION\nBEGIN;\n';
  const batchSize = 1000;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    sql += 'INSERT INTO public.products (id, vendor_id, category_id, brand_id, name, slug, description, status, base_price, unit, package_size, image_url, search_terms, published_at)\nVALUES\n';
    sql += batch.map(p => {
      const searchTerms = `ARRAY[${p.search_terms.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]`;
      return `  ('${p.id}', '${p.vendor_id}', '${p.category_id}', '${p.brand_id}', '${p.name.replace(/'/g, "''")}', '${p.slug}', '${p.description.replace(/'/g, "''")}', 'ACTIVE', ${p.base_price}, '${p.unit}', '${p.package_size}', '${p.image_url}', ${searchTerms}, now())`;
    }).join(',\n') + '\nON CONFLICT (vendor_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, base_price = EXCLUDED.base_price, brand_id = EXCLUDED.brand_id, category_id = EXCLUDED.category_id, unit = EXCLUDED.unit, package_size = EXCLUDED.package_size, image_url = EXCLUDED.image_url, search_terms = EXCLUDED.search_terms, published_at = now();\n\n';
  }
  sql += 'COMMIT;';
  fs.writeFileSync(path.join(__dirname, '../supabase/migrations/20260611000000_ppc_product_universe.sql'), sql);
}
main();
