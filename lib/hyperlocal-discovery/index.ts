import type {
  CommerceSearchTokens,
  DiscoveryContext,
  DiscoveryIntent,
  DiscoveryLanguage,
  DiscoveryProductDocument,
  HyperlocalRankedProduct,
  HyperlocalSearchResult,
  LocalizedCommerceNames,
  QueryUnderstanding,
  SearchLearningSnapshot,
} from "@/types/hyperlocal-discovery";
import type { Product } from "@/types";

type AliasGroup = {
  canonical: string;
  terms: string[];
  languages: DiscoveryLanguage[];
  intents?: DiscoveryIntent[];
  recipeTokens?: string[];
  festivalTokens?: string[];
};

const aliasGroups: AliasGroup[] = [
  {
    canonical: "coriander",
    terms: ["coriander", "malli", "kothamalli", "kothamaly", "kothmalli", "dhania", "kottambari", "kothimeera"],
    languages: ["en", "ta", "te", "kn", "hi", "romanized"],
  },
  {
    canonical: "small onion",
    terms: ["small onion", "shallots", "sambar onion", "chinna vengayam", "vengayam", "ulli", "erulli", "piyaz"],
    languages: ["en", "ta", "te", "kn", "ml", "hi", "romanized"],
    intents: ["recipe"],
    recipeTokens: ["sambar", "chutney", "fish curry"],
  },
  {
    canonical: "moringa leaves",
    terms: ["moringa leaves", "murungai keerai", "drumstick leaves", "munagaku", "nugge soppu"],
    languages: ["en", "ta", "te", "kn", "romanized"],
  },
  {
    canonical: "dosa batter",
    terms: ["dosa batter", "idli batter", "dosa maavu", "amma dosa maavu", "maavu", "dose hittu"],
    languages: ["en", "ta", "kn", "romanized"],
    intents: ["time_window", "recipe"],
    recipeTokens: ["breakfast", "quick breakfast", "chutney"],
  },
  {
    canonical: "pooja flowers",
    terms: ["pooja flowers", "puja flowers", "malligai", "jasmine", "marigold", "sambrani", "agarbathi"],
    languages: ["en", "ta", "te", "kn", "ml", "hi", "romanized"],
    intents: ["pooja", "festival", "freshness"],
    festivalTokens: ["diwali", "pongal", "onam"],
  },
  {
    canonical: "tea snacks",
    terms: ["tea kadai biscuits", "tea kadai snacks", "evening snacks", "quick tea snacks", "bajji items", "puffs", "mixture"],
    languages: ["en", "ta", "hi", "romanized"],
    intents: ["time_window", "weather"],
  },
  {
    canonical: "fish fry items",
    terms: ["fish fry items", "fish fry masala", "meen varuval", "fish masala", "seafood masala"],
    languages: ["en", "ta", "ml", "romanized"],
    intents: ["recipe", "freshness"],
    recipeTokens: ["fish", "chilli powder", "turmeric", "ginger garlic"],
  },
  {
    canonical: "hostel essentials",
    terms: ["hostel products", "hostel essentials", "student essentials", "instant noodles", "bucket", "detergent"],
    languages: ["en", "hi", "romanized"],
    intents: ["hostel"],
  },
  {
    canonical: "diabetic products",
    terms: ["diabetic products", "sugar free", "millet", "ragi", "low sugar"],
    languages: ["en", "hi", "romanized"],
    intents: ["health"],
  },
];

const festivalOntology = {
  pongal: ["sugarcane", "turmeric", "pongal pot", "jaggery", "raw rice", "moong dal"],
  diwali: ["sweets", "lamps", "diya", "pooja", "flowers", "ghee"],
  onam: ["banana leaf", "flowers", "sadya", "coconut", "payasam"],
  ramadan: ["dates", "juice", "meat", "rose milk", "seviyan"],
} as const;

const timeWindows = {
  morning: ["milk", "flowers", "fish", "greens", "breakfast", "batter", "idli", "dosa"],
  tea: ["bakery", "snacks", "biscuits", "tea", "puffs", "bajji"],
  evening: ["dinner", "batter", "vegetables", "chapati", "curry"],
  night: ["quick dinner", "ready meals", "curd", "bread"],
} as const;

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function tokens(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function phoneticToken(value: string) {
  return normalize(value)
    .replace(/[aeiou]/g, "")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/dh/g, "d")
    .replace(/ng/g, "n");
}

function trigrams(value: string) {
  const normalized = `  ${normalize(value)}  `;
  return Array.from({ length: Math.max(0, normalized.length - 2) }, (_, index) => normalized.slice(index, index + 3));
}

function trigramSimilarity(left: string, right: string) {
  const leftSet = new Set(trigrams(left));
  const rightSet = new Set(trigrams(right));
  if (!leftSet.size || !rightSet.size) return 0;
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  return (2 * intersection) / (leftSet.size + rightSet.size);
}

function detectLanguages(query: string, requested?: DiscoveryLanguage): DiscoveryLanguage[] {
  const languages = new Set<DiscoveryLanguage>(requested ? [requested] : []);
  if (/\p{Script=Tamil}/u.test(query)) languages.add("ta");
  if (/\p{Script=Telugu}/u.test(query)) languages.add("te");
  if (/\p{Script=Kannada}/u.test(query)) languages.add("kn");
  if (/\p{Script=Malayalam}/u.test(query)) languages.add("ml");
  if (/\p{Script=Devanagari}/u.test(query)) languages.add("hi");
  if (/[a-z]/i.test(query)) languages.add("romanized");
  if (!languages.size) languages.add("en");
  return [...languages];
}

function resolveAliasGroups(query: string) {
  const normalized = normalize(query);
  const queryTokens = tokens(normalized);
  return aliasGroups.filter((group) =>
    group.terms.some((term) => normalized.includes(term) || queryTokens.some((token) => trigramSimilarity(token, term) > 0.72 || phoneticToken(token) === phoneticToken(term))),
  );
}

function inferTimeWindow(now = new Date()) {
  const hour = now.getHours();
  if (hour < 11) return "morning";
  if (hour >= 15 && hour < 18) return "tea";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function inferIntents(query: string, groups: AliasGroup[], context: DiscoveryContext): DiscoveryIntent[] {
  const normalized = normalize(query);
  const intents = new Set<DiscoveryIntent>(groups.flatMap((group) => group.intents ?? []));
  if (/(sambar|fish fry|combo|ingredients|samayal|cooking)/.test(normalized)) intents.add("recipe");
  if (/(rain|rainy|mazhai)/.test(normalized) || context.weather === "rainy") intents.add("weather");
  if (/(breakfast|morning|tea|evening|quick)/.test(normalized)) intents.add("time_window");
  if (/(pooja|puja|flower|agarbathi|sambrani)/.test(normalized)) intents.add("pooja");
  if (/(fresh|fish|flower|bakery|milk|greens)/.test(normalized)) intents.add("freshness");
  if (context.festival && context.festival !== "none") intents.add("festival");
  if (/(hostel|student)/.test(normalized)) intents.add("hostel");
  if (/(diabetic|sugar free|healthy)/.test(normalized)) intents.add("health");
  if (!intents.size) intents.add(query.trim().split(/\s+/).length <= 3 ? "exact" : "generic");
  return [...intents];
}

export function understandCommerceQuery(query: string, context: DiscoveryContext = {}): QueryUnderstanding {
  const normalizedQuery = normalize(query);
  const groups = resolveAliasGroups(query);
  const intents = inferIntents(query, groups, context);
  const contextualFestivalTerms = context.festival && context.festival !== "none" ? [...festivalOntology[context.festival]] : [];
  const windowTerms = [...timeWindows[inferTimeWindow(context.now)]];
  const canonicalTerms = unique([...tokens(normalizedQuery), ...groups.map((group) => group.canonical)]);
  const shouldExpandContext = !normalizedQuery || intents.includes("time_window") || intents.includes("festival") || intents.includes("pooja");
  const expandedTerms = unique([
    ...canonicalTerms,
    ...groups.flatMap((group) => group.terms),
    ...groups.flatMap((group) => group.recipeTokens ?? []),
    ...groups.flatMap((group) => group.festivalTokens ?? []),
    ...(shouldExpandContext ? contextualFestivalTerms : []),
    ...(shouldExpandContext ? windowTerms : []),
  ]);

  return {
    originalQuery: query,
    normalizedQuery,
    languages: detectLanguages(query, context.language),
    intents,
    canonicalTerms,
    expandedTerms,
    aliasGroups: groups.map((group) => group.canonical),
    fuzzyTerms: unique(expandedTerms.flatMap((term) => [term, term.replace(/[aeiou]/g, ""), term.replace(/\s+/g, "")])),
    phoneticTerms: unique(expandedTerms.map(phoneticToken)),
    voiceLike: /\b(amma|near me|quick|items|products|samayal|kadai)\b/.test(normalizedQuery) || normalizedQuery.split(" ").length >= 3,
    localityHints: unique([context.buyerLocation?.locality, context.buyerLocation?.city].filter(Boolean) as string[]),
    recipeHints: unique(groups.flatMap((group) => group.recipeTokens ?? [])),
    festivalHints: unique([...groups.flatMap((group) => group.festivalTokens ?? []), ...contextualFestivalTerms]),
  };
}

export function buildDiscoveryProductDocument(product: Product): DiscoveryProductDocument {
  const baseTerms = [product.name, product.description, product.category.name, product.category.slug, product.vendor.name, product.vendor.locality, product.vendor.city, product.unit, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  const groups = resolveAliasGroups(baseTerms);
  const expanded = unique([...tokens(baseTerms), ...groups.flatMap((group) => [group.canonical, ...group.terms])]);
  const lower = baseTerms.toLowerCase();
  const perishable = /(fish|flower|milk|greens|bakery|batter|paneer|fresh)/.test(lower);
  const coldChain = /(milk|paneer|fish|meat|curd)/.test(lower);
  const highRisk = /(fish|flower|greens)/.test(lower);
  const tokensPayload: CommerceSearchTokens = {
    search_tokens: expanded,
    phonetic_tokens: unique(expanded.map(phoneticToken)),
    fuzzy_tokens: unique(expanded.flatMap((term) => [term.replace(/[aeiou]/g, ""), term.replace(/\s+/g, "")])),
    transliteration_tokens: unique(groups.flatMap((group) => group.terms)),
    voice_tokens: unique([...expanded, product.name, `${product.category.name} near me`].map(normalize)),
    recipe_tokens: unique(groups.flatMap((group) => group.recipeTokens ?? [])),
    festival_tokens: unique(groups.flatMap((group) => group.festivalTokens ?? [])),
    context_tokens: unique([product.vendor.locality, product.vendor.city, product.category.slug, product.vendor.serviceStatus, ...(product.trustSignals ?? [])].filter(Boolean) as string[]),
  };

  const localization: LocalizedCommerceNames = {
    localized_names: { en: product.name },
    regional_aliases: unique(groups.flatMap((group) => group.terms)),
    slang_aliases: unique(groups.flatMap((group) => group.terms.filter((term) => !term.includes(product.name.toLowerCase())))),
    phonetic_aliases: tokensPayload.phonetic_tokens,
    transliterated_aliases: tokensPayload.transliteration_tokens,
  };

  return {
    product,
    tokens: tokensPayload,
    localization,
    intentTags: unique(groups.flatMap((group) => group.intents ?? [])),
    contextualTags: tokensPayload.context_tokens,
    behavioralTags: ["repeat_purchase_ready", product.stockCount > 0 ? "available_now" : "stockout"],
    emotionalTags: lower.includes("amma") || lower.includes("home") ? ["home_style"] : [],
    localityEmbeddings: unique([product.vendor.locality, product.vendor.city, product.category.slug].filter(Boolean) as string[]),
    semanticEmbeddingId: `product:${product.id}:commerce-intent`,
    vectorIndexKey: `hyperlocal:${product.vendor.city ?? "unknown"}:${product.vendor.locality ?? "market"}:${product.id}`,
    perishability: {
      class: coldChain ? "cold_chain" : highRisk ? "highly_perishable" : perishable ? "fresh" : "ambient",
      freshnessWindowHours: highRisk ? 8 : coldChain ? 18 : perishable ? 36 : 720,
      coldChainRequired: coldChain,
    },
  };
}

function textMatchScore(query: QueryUnderstanding, document: DiscoveryProductDocument) {
  const docTerms = new Set([
    ...document.tokens.search_tokens,
    ...document.tokens.transliteration_tokens,
    ...document.tokens.recipe_tokens,
    ...document.tokens.festival_tokens,
    ...document.tokens.context_tokens.map(normalize),
  ]);
  const meaningfulTerms = query.expandedTerms.filter((term) => term.length >= 4);
  const matched = meaningfulTerms.filter((term) => [...docTerms].some((docTerm) => docTerm.length >= 4 && (docTerm.includes(term) || term.includes(docTerm))));
  const fuzzy = query.fuzzyTerms
    .filter((term) => term.length >= 4)
    .filter((term) => document.tokens.fuzzy_tokens.includes(term) || document.tokens.phonetic_tokens.includes(term));
  return {
    matched: unique([...matched, ...fuzzy]),
    score: Math.min(1, (matched.length + fuzzy.length * 0.65) / Math.max(2, meaningfulTerms.length)),
  };
}

function scoreLocality(product: Product, context: DiscoveryContext) {
  const buyer = context.buyerLocation;
  if (!buyer) return 0.55;
  const sameLocality = buyer.locality && buyer.locality === product.vendor.locality ? 0.35 : 0;
  const sameCity = buyer.city && buyer.city === product.vendor.city ? 0.25 : 0;
  const radius = product.vendor.serviceRadiusKm ?? 6;
  const radiusReadiness = radius >= 4 ? 0.18 : 0.08;
  return Math.min(1, 0.25 + sameLocality + sameCity + radiusReadiness);
}

function scoreTime(product: Product, query: QueryUnderstanding, context: DiscoveryContext) {
  const window = inferTimeWindow(context.now);
  const terms = timeWindows[window];
  const productText = normalize([product.name, product.description, product.category.name, ...(product.tags ?? [])].filter(Boolean).join(" "));
  const hit = terms.some((term) => productText.includes(term));
  return hit || query.intents.includes("time_window") ? 0.85 : 0.48;
}

function scoreFestival(product: Product, query: QueryUnderstanding, context: DiscoveryContext) {
  const festival = context.festival;
  if (!festival || festival === "none") return query.intents.includes("festival") ? 0.62 : 0.45;
  const productText = normalize([product.name, product.description, product.category.name, ...(product.tags ?? [])].filter(Boolean).join(" "));
  return festivalOntology[festival].some((term) => productText.includes(term)) ? 0.94 : 0.52;
}

function scoreSeller(product: Product) {
  const rating = Math.min(1, product.vendor.rating / 5);
  const open = product.vendor.serviceStatus === "open" ? 0.25 : product.vendor.serviceStatus === "busy" ? 0.12 : 0;
  const reliableStock = product.stockCount > 0 ? 0.22 : 0;
  const delivery = product.deliveryMinutes ? Math.max(0.1, 1 - product.deliveryMinutes / 90) * 0.18 : 0.08;
  return Math.min(1, rating * 0.35 + open + reliableStock + delivery);
}

function scorePerishability(document: DiscoveryProductDocument, context: DiscoveryContext, product: Product) {
  const eta = product.deliveryMinutes ?? product.vendor.fulfillmentPromiseMinutes ?? 45;
  const etaHours = eta / 60;
  const freshnessFit = Math.max(0.15, 1 - etaHours / document.perishability.freshnessWindowHours);
  const freshSignal = document.perishability.class === "ambient" ? 0.62 : freshnessFit;
  const weatherBoost = context.weather === "hot" && document.perishability.coldChainRequired ? -0.12 : 0;
  return Math.max(0, Math.min(1, freshSignal + weatherBoost));
}

function explainRank(product: Product, signals: HyperlocalRankedProduct["rankSignals"], query: QueryUnderstanding) {
  if (signals.alias > 0.7) return `Understands local naming for ${query.aliasGroups[0] ?? product.category.name}.`;
  if (signals.perishability > 0.8 && query.intents.includes("freshness")) return "Freshness and delivery window fit this search.";
  if (signals.locality > 0.8) return `Strong local match from ${product.vendor.locality}.`;
  if (signals.festival > 0.8) return "Boosted for current festival demand.";
  if (signals.time > 0.8) return "Fits the current shopping time window.";
  return "Matched by local availability, seller readiness, and commerce intent.";
}

export function searchHyperlocalCommerce(query: string, products: Product[], context: DiscoveryContext = {}): HyperlocalSearchResult {
  const understood = understandCommerceQuery(query, context);
  const documents = products.map(buildDiscoveryProductDocument);
  const ranked = documents
    .filter((document) => document.product.stockCount > 0)
    .map((document) => {
      const text = textMatchScore(understood, document);
      const alias = understood.aliasGroups.some((group) => document.localization.regional_aliases.includes(group) || document.tokens.search_tokens.includes(group)) ? 0.9 : text.score * 0.75;
      const intent = understood.intents.some((intentTag) => document.intentTags.includes(intentTag)) ? 0.86 : understood.intents.includes("generic") ? 0.55 : 0.42;
      const locality = scoreLocality(document.product, context);
      const time = scoreTime(document.product, understood, context);
      const festival = scoreFestival(document.product, understood, context);
      const perishability = scorePerishability(document, context, document.product);
      const seller = scoreSeller(document.product);
      const basket = context.cartProductIds?.some((id) => id === document.product.id) ? 0.2 : understood.recipeHints.some((hint) => document.tokens.search_tokens.includes(hint)) ? 0.82 : 0.5;
      const freshness = document.tokens.search_tokens.includes("fresh") || document.tokens.context_tokens.some((term) => normalize(term).includes("fresh")) ? 0.88 : perishability;
      const vectorReadiness = document.semanticEmbeddingId && document.vectorIndexKey ? 0.92 : 0.2;
      const signals = { text: text.score, alias, intent, locality, time, festival, perishability, seller, basket, freshness, vectorReadiness };
      const score =
        text.score * 0.2 +
        alias * 0.14 +
        intent * 0.12 +
        locality * 0.12 +
        time * 0.08 +
        festival * 0.07 +
        perishability * 0.08 +
        seller * 0.1 +
        basket * 0.04 +
        freshness * 0.03 +
        vectorReadiness * 0.02;

      return {
        product: document.product,
        score,
        matchedTerms: text.matched,
        rankSignals: signals,
        reason: explainRank(document.product, signals, understood),
      };
    })
    .filter((item) => !query.trim() || item.matchedTerms.length > 0 || item.rankSignals.alias > 0.7 || (item.rankSignals.intent > 0.8 && item.rankSignals.text > 0.2))
    .sort((left, right) => right.score - left.score);

  return {
    query: understood,
    results: ranked,
    autocomplete: buildHyperlocalAutocomplete(query, products, context),
    recommendations: buildContextualRecommendations(products, context, understood),
    analytics: buildSearchLearningSnapshot(understood, ranked),
  };
}

export function buildHyperlocalAutocomplete(query: string, products: Product[], context: DiscoveryContext = {}) {
  const normalized = normalize(query);
  const productTerms = products.flatMap((product) => [product.name, product.category.name, ...(product.tags ?? [])]);
  const aliasTerms = aliasGroups.flatMap((group) => [group.canonical, ...group.terms, ...(group.recipeTokens ?? []), ...(group.festivalTokens ?? [])]);
  const festivalTerms = context.festival && context.festival !== "none" ? [...festivalOntology[context.festival]] : [];
  const windowTerms = [...timeWindows[inferTimeWindow(context.now)]];
  return unique([...productTerms, ...aliasTerms, ...festivalTerms, ...windowTerms])
    .map(normalize)
    .filter((term) => term && (!normalized || term.includes(normalized) || trigramSimilarity(term, normalized) > 0.45))
    .slice(0, 8);
}

export function buildContextualRecommendations(products: Product[], context: DiscoveryContext, query?: QueryUnderstanding) {
  const available = products.filter((product) => product.stockCount > 0);
  const byScore = (selector: (product: Product) => number) => [...available].sort((a, b) => selector(b) - selector(a)).slice(0, 4);
  const queryTerms = query?.expandedTerms ?? [];
  return {
    frequentlyBoughtTogether: byScore((product) => (queryTerms.some((term) => normalize(product.name).includes(term) || product.tags?.some((tag) => normalize(tag).includes(term))) ? 1 : 0.4) + product.rating / 10),
    recipeBased: byScore((product) => (query?.recipeHints.some((hint) => normalize([product.name, ...(product.tags ?? [])].join(" ")).includes(hint)) ? 1 : 0.35)),
    localityBased: byScore((product) => scoreLocality(product, context)),
    timeBased: byScore((product) => scoreTime(product, query ?? understandCommerceQuery("", context), context)),
    festivalBased: byScore((product) => scoreFestival(product, query ?? understandCommerceQuery("", context), context)),
    sellerBased: byScore(scoreSeller),
  };
}

export function buildSearchLearningSnapshot(query: QueryUnderstanding, ranked: HyperlocalRankedProduct[]): SearchLearningSnapshot {
  const unknownTerms = query.canonicalTerms.filter((term) => !query.expandedTerms.includes(term) || ranked.every((item) => !item.matchedTerms.includes(term)));
  return {
    query: query.originalQuery,
    resultCount: ranked.length,
    failed: ranked.length === 0,
    voiceLike: query.voiceLike,
    slangDetected: query.aliasGroups.length > 0,
    multilingual: query.languages.length > 1 || query.languages.some((language) => language !== "en" && language !== "romanized"),
    missingProductCandidates: ranked.length === 0 ? unknownTerms : [],
    aliasSuggestions: query.aliasGroups.map((group) => ({ term: group, suggestedCanonical: group, confidence: 0.86 })),
    heatmapKey: `${query.localityHints[0] ?? "market"}:${query.intents.join("+")}:${normalize(query.originalQuery) || "empty"}`,
  };
}
