export function vectorToSqlLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

export function vectorFromSqlLiteral(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!normalized) return null;
  const vector = normalized
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  return vector.length ? vector : null;
}
