export const AI_EMBEDDING_MODEL = "text-embedding-3-small";
export const AI_EMBEDDING_DIMENSIONS = 1536;
export const LOCAL_EMBEDDING_DIMENSIONS = 96;

export function buildEmbeddingInput(parts: Array<string | number | undefined | null>) {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== null && `${part}`.trim().length > 0)
    .map((part) => `${part}`.trim())
    .join(" | ");
}
