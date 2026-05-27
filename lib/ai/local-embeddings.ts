import { LOCAL_EMBEDDING_DIMENSIONS } from "./embedding-config";

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function tokenizeForIntelligence(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function createDeterministicEmbedding(input: string, dimensions = LOCAL_EMBEDDING_DIMENSIONS) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenizeForIntelligence(input);

  tokens.forEach((token, tokenIndex) => {
    const hash = hashToken(token);
    const primary = hash % dimensions;
    const secondary = (hash >>> 7) % dimensions;
    const sign = hash % 2 === 0 ? 1 : -1;
    const weight = 1 + Math.min(0.35, token.length / 24) + tokenIndex * 0.002;
    vector[primary] += sign * weight;
    vector[secondary] += sign * 0.45;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
