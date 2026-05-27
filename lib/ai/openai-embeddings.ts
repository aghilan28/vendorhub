import { AI_EMBEDDING_MODEL, AI_EMBEDDING_DIMENSIONS } from "./embedding-config";
import { createDeterministicEmbedding } from "./local-embeddings";

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

export async function createCommerceEmbedding(input: string) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      embedding: createDeterministicEmbedding(input, AI_EMBEDDING_DIMENSIONS),
      provider: "local-fallback" as const,
      model: "deterministic-local-commerce-vector",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_EMBEDDING_MODEL,
        input,
        encoding_format: "float",
      }),
    });

    if (!response.ok) throw new Error(`Embedding request failed with ${response.status}`);
    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding?.length) throw new Error("Embedding response did not include a vector.");

    return { embedding, provider: "openai" as const, model: AI_EMBEDDING_MODEL };
  } catch {
    return {
      embedding: createDeterministicEmbedding(input, AI_EMBEDDING_DIMENSIONS),
      provider: "local-fallback" as const,
      model: "deterministic-local-commerce-vector",
    };
  }
}
