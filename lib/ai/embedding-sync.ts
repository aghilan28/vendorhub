import { buildEmbeddingInput } from "@/lib/ai/embedding-config";
import { createCommerceEmbedding } from "@/lib/ai/openai-embeddings";
import { vectorToSqlLiteral } from "@/lib/ai/vector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "@/lib/production/observability";
import type { Tables } from "@/types/database";

type ProductEmbeddingSource = Tables<"products"> & {
  category?: Pick<Tables<"categories">, "name" | "slug" | "description"> | null;
  vendor?: Pick<Tables<"vendors">, "name" | "slug" | "description" | "metadata"> | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function jsonText(value: unknown) {
  const object = asObject(value);
  return Object.entries(object)
    .filter(([, item]) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    .map(([key, item]) => `${key}: ${item}`)
    .join(" | ");
}

function metadataText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return String(value);
  return undefined;
}

export function buildProductEmbeddingInput(row: ProductEmbeddingSource) {
  const vendorMetadata = asObject(row.vendor?.metadata);
  return buildEmbeddingInput([
    row.name,
    row.slug,
    row.description,
    row.category?.name,
    row.category?.slug,
    row.category?.description,
    row.vendor?.name,
    row.vendor?.slug,
    row.vendor?.description,
    metadataText(vendorMetadata.locality),
    metadataText(vendorMetadata.city),
    row.currency,
    row.base_price,
    jsonText(row.ai_index_metadata),
    jsonText(row.discovery_metadata),
  ]);
}

export async function refreshProductEmbedding(productId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug, description), vendor:vendors(name, slug, description, metadata)")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) throw error ?? new Error("Product not found for embedding refresh.");

  const input = buildProductEmbeddingInput(data as unknown as ProductEmbeddingSource);
  const embedding = await createCommerceEmbedding(input);
  const { error: updateError } = await supabase
    .from("products")
    .update({
      embedding: vectorToSqlLiteral(embedding.embedding),
      embedding_text: input,
      embedding_model: embedding.model,
      embedding_updated_at: new Date().toISOString(),
      search_quality_score: Math.min(100, Math.max(1, Math.round(input.length / 12))),
    } as any)
    .eq("id", productId);

  if (updateError) throw updateError;

  recordOperationalEvent("info", "ai.product_embedding.refreshed", {
    productId,
    provider: embedding.provider,
    model: embedding.model,
    textLength: input.length,
  }, { domain: "ai", subjectId: productId });

  return {
    productId,
    provider: embedding.provider,
    model: embedding.model,
    textLength: input.length,
  };
}

export async function refreshStaleProductEmbeddings(limit = 20) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, updated_at, embedding_updated_at")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .or("embedding_updated_at.is.null,embedding.is.null")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const refreshed = [];
  for (const product of data ?? []) {
    try {
      refreshed.push(await refreshProductEmbedding(product.id));
    } catch (error) {
      recordOperationalEvent("error", "ai.product_embedding.refresh_failed", {
        productId: product.id,
      }, { domain: "ai", subjectId: product.id, error });
    }
  }

  return {
    scanned: data?.length ?? 0,
    refreshed,
  };
}
