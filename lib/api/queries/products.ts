import { getPaginationRange, type QueryPage } from "@/lib/api/client";
import { getLiveRelatedProductIds } from "@/lib/ai/commerce-intelligence";
import { mapProductRowToProduct, type ProductListRow } from "@/lib/api/mappers/products";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductSearchInput = QueryPage & {
  query?: string;
  categorySlug?: string;
  vendorSlug?: string;
};

export async function listPublicProducts(input: ProductSearchInput = {}) {
  const supabase = await createSupabaseServerClient();
  const { from, to } = getPaginationRange(input);

  let query = supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        base_price,
        currency,
        vendor:vendors!inner(id, name, slug, rating_average),
        category:categories!inner(id, name, slug),
        images:product_images(storage_path, alt_text, is_primary),
        inventory(stock_quantity, reserved_quantity, low_stock_threshold, stock_status)
      `,
      { count: "exact" },
    )
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (input.query) {
    query = query.textSearch("search_document", input.query, { type: "websearch" });
  }

  if (input.categorySlug) {
    query = query.eq("categories.slug", input.categorySlug);
  }

  if (input.vendorSlug) {
    query = query.eq("vendors.slug", input.vendorSlug);
  }

  return query;
}

export async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();

  return supabase
    .from("products")
    .select(
      `
        *,
        vendor:vendors(*),
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*),
        inventory(*),
        reviews(id, rating, title, body, created_at)
      `,
    )
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .single();
}

export async function listLiveProducts(input: ProductSearchInput = {}) {
  const { data, error, count } = await listPublicProducts(input);

  if (error) {
    throw error;
  }

  return {
    products: ((data ?? []) as unknown as ProductListRow[]).map(mapProductRowToProduct),
    count: count ?? 0,
  };
}

export async function getLiveProductBySlug(slug: string) {
  const { data, error } = await getProductBySlug(slug);

  if (error || !data) {
    return null;
  }

  return mapProductRowToProduct(data as unknown as ProductListRow);
}

export async function listVectorRelatedProducts(productId: string, categorySlug: string, input: QueryPage = {}) {
  const ids = await getLiveRelatedProductIds(productId, input.pageSize ?? 8).catch(() => []);

  if (!ids.length) {
    return listLiveProducts({ ...input, categorySlug });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        vendor:vendors(*),
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*),
        inventory(*),
        reviews(id, rating, title, body, created_at)
      `,
    )
    .in("id", ids)
    .eq("status", "ACTIVE")
    .is("deleted_at", null);

  if (error) {
    return listLiveProducts({ ...input, categorySlug });
  }

  const order = new Map<string, number>((ids as string[]).map((id, index) => [id, index]));
  return {
    products: ((data ?? []) as unknown as ProductListRow[])
      .sort((a, b) => (order.get(String(a.id)) ?? 999) - (order.get(String(b.id)) ?? 999))
      .map(mapProductRowToProduct),
    count: data?.length ?? 0,
  };
}
