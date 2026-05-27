import { NextResponse } from "next/server";
import { z } from "zod";
import { buildEmbeddingInput } from "@/lib/ai/embedding-config";
import { createCommerceEmbedding } from "@/lib/ai/openai-embeddings";
import { vectorToSqlLiteral } from "@/lib/ai/vector";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type UnsafeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  from: (relation: string) => unknown;
};
type UpdateQuery = {
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => Promise<{ error: Error | null }>;
  };
};

const EmbeddingRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]).optional(),
  text: z.string().optional(),
  product_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = EmbeddingRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid embedding request." }, { status: 400 });
  }

  const source = parsed.data.input ?? parsed.data.text;
  if (!source) {
    return NextResponse.json({ error: "Embedding input is required." }, { status: 400 });
  }

  const input = Array.isArray(source) ? buildEmbeddingInput(source) : source;
  const result = await createCommerceEmbedding(input);

  if (parsed.data.product_id) {
    const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
    const productUpdates: Record<string, unknown> = {
      embedding: vectorToSqlLiteral(result.embedding),
      embedding_model: result.model,
      embedding_text: input,
      embedding_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase.from("products") as unknown as UpdateQuery)
      .update(productUpdates as never)
      .eq("id", parsed.data.product_id);

    if (error) {
      return NextResponse.json({ error: "Embedding generated but product update failed." }, { status: 500 });
    }
  }

  return NextResponse.json({
    embedding: result.embedding,
    provider: result.provider,
    model: result.model,
    dimensions: result.embedding.length,
  });
}
