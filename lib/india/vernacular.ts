import type { AppLocale } from "@/lib/i18n/config";

const latinAliases: Record<string, string[]> = {
  tamatar: ["tomato", "fresh produce"],
  sabzi: ["vegetables", "fresh produce"],
  phal: ["fruits"],
  kursi: ["chair", "office chair"],
  mobile: ["phone", "electronics"],
  cover: ["case", "phone cover"],
  samosa: ["snacks", "ready meals"],
  nashta: ["snacks", "breakfast"],
  idli: ["breakfast", "batter"],
  dosa: ["breakfast", "batter"],
};

const scriptAliases: Record<string, string[]> = {
  "टमाटर": ["tomato", "tamatar", "fresh produce"],
  "सब्ज़ी": ["vegetables", "sabzi", "fresh produce"],
  "कुर्सी": ["chair", "office chair"],
  "समोसा": ["samosa", "snacks"],
  "மொபைல்": ["mobile", "phone", "electronics"],
  "தக்காளி": ["tomato", "tamatar", "fresh produce"],
  "காய்கறி": ["vegetables", "fresh produce"],
  "நாற்காலி": ["chair", "office chair"],
  "இட்லி": ["idli", "breakfast"],
  "தோசை": ["dosa", "breakfast"],
};

export function detectQueryScript(query: string) {
  if (/\p{Script=Tamil}/u.test(query)) return "tamil";
  if (/\p{Script=Devanagari}/u.test(query)) return "devanagari";
  return "latin";
}

export function normalizeVernacularQuery(query: string, locale: AppLocale = "en") {
  const normalized = query
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const tokens = normalized.split(" ").filter(Boolean);
  const expansions = new Set<string>();

  for (const token of tokens) {
    for (const item of latinAliases[token] ?? []) expansions.add(item);
    for (const item of scriptAliases[token] ?? []) expansions.add(item);
  }

  for (const [scriptToken, aliases] of Object.entries(scriptAliases)) {
    if (normalized.includes(scriptToken.toLowerCase())) {
      aliases.forEach((alias) => expansions.add(alias));
    }
  }

  return {
    original: query,
    normalized,
    locale,
    script: detectQueryScript(query),
    expandedQuery: [normalized, ...expansions].join(" "),
    expansions: [...expansions],
  };
}
