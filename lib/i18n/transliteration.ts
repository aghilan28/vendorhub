export const TRANSLITERATION_MAP: Record<string, string[]> = {
  pal: ["milk", "dairy"],
  arisi: ["rice"],
  meen: ["fish", "seafood"],
  keerai: ["spinach", "greens"],
  pazham: ["fruit"],
  kaai: ["vegetable"],
  kapi: ["coffee"],
  thei: ["tea"],
  doodh: ["milk", "dairy"],
  chawal: ["rice"],
  machli: ["fish", "seafood"],
  sabzi: ["vegetable"],
  phal: ["fruit"],
  chai: ["tea"],
  kapda: ["clothes", "clothing"],
  juta: ["shoes", "footwear"],
};

export function expandQuery(query: string): string[] {
  const lower = query.trim().toLowerCase();
  const expansions = TRANSLITERATION_MAP[lower] ?? [];
  return [query, ...expansions];
}
