import { buildSemanticDiscoveryPlan } from "@/lib/ai/semantic-discovery";
import { normalizeCommerceText } from "@/lib/commerce-foundation";
import { buildHyperlocalOperationsSnapshot } from "@/lib/hyperlocal-operations";
import type { Product } from "@/types";
import type {
  AiAutomationJob,
  AiCatalogDraft,
  AiCommerceAutomationInput,
  AiCommerceAutomationSnapshot,
  AiImageAnalysis,
  AiProductMatch,
  AiSafetyAssessment,
  AiSellerSuggestion,
  CommerceIntent,
  OcrDocumentIntelligence,
  ParsedCommerceLineItem,
  SellerShopType,
  WhatsappCommerceEvent,
} from "@/types/ai-commerce-automation";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function hashText(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

const slangAliases: Record<string, string> = {
  aavinblue: "aavin standard milk 500ml",
  "greenpacketmilk": "aavin milk 500ml",
  "500milk": "milk 500 ml",
  paal: "milk",
  meen: "fish",
  kaapi: "coffee",
  pazham: "banana fruit",
  kattu: "bunch",
  malligai: "jasmine flower",
  thayir: "curd",
};

const unitMap: Record<string, ParsedCommerceLineItem["unit"]> = {
  kg: "kg",
  kilo: "kg",
  g: "g",
  gram: "g",
  l: "l",
  litre: "l",
  ml: "ml",
  pkt: "packet",
  pack: "packet",
  packet: "packet",
  pc: "piece",
  piece: "piece",
  bunch: "bunch",
  kattu: "bunch",
  string: "string",
  box: "box",
};

function normalizeMessyText(text: string) {
  return text
    .replace(/[|]/g, "1")
    .replace(/[₹]/g, " rs ")
    .replace(/\bO(?=\d)/gi, "0")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  return normalizeCommerceText(text)
    .split(/\s+/)
    .map((token) => slangAliases[token.replace(/\s/g, "")] ?? token)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
}

function inferCategory(text: string) {
  const normalized = text.toLowerCase();
  if (/(fish|meen|seafood|meat)/.test(normalized)) return "meat-seafood";
  if (/(milk|curd|paal|paneer|dairy)/.test(normalized)) return "dairy";
  if (/(flower|malligai|pooja|camphor|agarbathi)/.test(normalized)) return "pooja-items";
  if (/(bread|bun|cake|batter|idli|dosa|bakery)/.test(normalized)) return "bakery-breakfast";
  if (/(tablet|pharmacy|medicine|syrup)/.test(normalized)) return "pharmacy";
  if (/(onion|tomato|banana|vegetable|greens|keerai)/.test(normalized)) return "fresh-produce";
  return "general-grocery";
}

function detectLanguages(text: string) {
  const hints = new Set<string>(["en"]);
  if (/[\u0b80-\u0bff]/.test(text) || /\b(paal|meen|thayir|malligai|kaapi|kattu)\b/i.test(text)) hints.add("ta");
  if (/[\u0d00-\u0d7f]/.test(text)) hints.add("ml");
  if (/[\u0900-\u097f]/.test(text)) hints.add("hi");
  return [...hints];
}

export function parseCommerceLineItems(text: string): ParsedCommerceLineItem[] {
  const lines = text
    .split(/\n|;|,/)
    .map((line) => normalizeMessyText(line))
    .filter(Boolean);

  return lines.flatMap((line) => {
    const priceMatch = line.match(/(?:rs\.?|rate|price)?\s*(\d{1,5})(?:\s*\/-)?\s*$/i);
    const quantityMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|g|gram|l|litre|ml|pkt|pack|packet|pc|piece|bunch|kattu|string|box)?/i);
    const price = priceMatch ? Number(priceMatch[1]) : undefined;
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const unitText = quantityMatch?.[2]?.toLowerCase() ?? "unknown";
    const unit = unitMap[unitText] ?? "unknown";
    const productName = line
      .replace(/(?:rs\.?|rate|price)?\s*\d{1,5}(?:\s*\/-)?\s*$/i, "")
      .replace(/\d+(?:\.\d+)?\s*(kg|kilo|g|gram|l|litre|ml|pkt|pack|packet|pc|piece|bunch|kattu|string|box)?/i, "")
      .replace(/\b(stock|available|came|send|today|rate)\b/gi, "")
      .trim() || line.trim();
    const tokens = tokenize(productName);
    if (!tokens.length) return [];
    return [
      {
        rawText: line,
        productName,
        quantity,
        unit,
        unitText,
        price,
        tax: /\bgst|tax\b/i.test(line) && price ? round(price * 0.05, 2) : undefined,
        aliases: [...new Set([productName.toLowerCase(), ...tokens])].slice(0, 8),
        confidence: round(clamp(0.52 + (quantityMatch ? 0.16 : 0) + (priceMatch ? 0.12 : 0) + (unit !== "unknown" ? 0.12 : 0) - (/[?~]/.test(line) ? 0.12 : 0)), 3),
      },
    ];
  });
}

export function analyzeOcrDocument(input: AiCommerceAutomationInput): OcrDocumentIntelligence {
  const text = input.text ?? input.image?.detectedText?.join("\n") ?? "";
  const lineItems = parseCommerceLineItems(text);
  const layout = /bill|gst|total/i.test(text)
    ? "thermal_receipt"
    : /whatsapp|wa\.me|\+\d{10}/i.test(text)
      ? "whatsapp_screenshot"
      : /stock|available|rate/i.test(text)
        ? "stock_list"
        : /[~?]{2,}|[|]{2,}/.test(text)
          ? "handwritten_invoice"
          : "unknown";
  const total = lineItems.reduce((sum, item) => sum + (item.price ?? 0) * Math.max(1, item.quantity), 0);
  const noiseScore = clamp((text.match(/[~?|]/g)?.length ?? 0) / Math.max(1, text.length / 12) + lineItems.filter((item) => item.confidence < 0.65).length * 0.12);
  const confidence = round(clamp((lineItems.reduce((sum, item) => sum + item.confidence, 0) / Math.max(1, lineItems.length)) - noiseScore * 0.22), 3);
  return {
    documentId: `ocr-${hashText(`${input.source}:${text}:${input.now?.toISOString() ?? ""}`)}`,
    source: input.source,
    sellerName: input.seller?.name ?? text.match(/seller[:\s]+([a-z0-9\s]+)/i)?.[1]?.trim(),
    timestamp: input.now?.toISOString(),
    locality: input.locality ?? input.seller?.locality,
    languageHints: detectLanguages(text),
    layout,
    lineItems,
    totals: { subtotal: round(total, 2), total: round(total, 2) },
    noiseScore: round(noiseScore, 3),
    confidence,
    needsHumanReview: confidence < 0.72 || noiseScore > 0.28,
    auditTrail: ["ocr-normalized", "line-items-extracted", "human-review-gate-enforced"],
  };
}

function inferIntent(text: string): CommerceIntent {
  if (/\b(send|need|want|order|venum|kodunga)\b/i.test(text)) return "order_request";
  if (/\b(rate|price|rs|₹)\b/i.test(text)) return "price_update";
  if (/\b(stock came|available|fresh|vandhuchu|arrived)\b/i.test(text)) return "stock_arrival";
  if (/\b(expiry|old|spoiling|clearance)\b/i.test(text)) return "freshness_warning";
  if (/\b(add product|new item|catalog)\b/i.test(text)) return "catalog_creation";
  if (/\b(stock|qty|quantity)\b/i.test(text)) return "inventory_update";
  return "unknown";
}

export function parseWhatsappCommerce(input: AiCommerceAutomationInput): WhatsappCommerceEvent {
  const text = normalizeMessyText(input.text ?? input.image?.detectedText?.join(" ") ?? "");
  const lineItems = parseCommerceLineItems(text);
  const intent = inferIntent(text);
  const first = lineItems[0];
  const structuredEvent = !first
    ? { type: "unknown" as const, rawText: text }
    : intent === "order_request"
      ? { type: "order" as const, productName: first.productName, quantity: first.quantity, unit: first.unit }
      : intent === "price_update" && first.price
        ? { type: "pricing" as const, productName: first.productName, price: first.price }
        : { type: "inventory" as const, productName: first.productName, quantity: first.quantity, unit: first.unit, price: first.price };
  return {
    messageId: `wa-${hashText(text)}`,
    intent,
    sellerName: input.seller?.name,
    locality: input.locality ?? input.seller?.locality,
    lineItems,
    structuredEvent,
    confidence: round(clamp(0.5 + lineItems.length * 0.12 + (intent !== "unknown" ? 0.18 : 0) - (text.length < 4 ? 0.2 : 0)), 3),
    voiceReadyTranscript: text.toLowerCase(),
    replayKey: `wa:${hashText(`${input.seller?.id ?? "seller"}:${text}`)}`,
  };
}

export function matchProducts(input: string, products: Product[]): AiProductMatch {
  const queryTokens = tokenize(input);
  const expanded = slangAliases[input.toLowerCase().replace(/\s/g, "")] ?? input;
  const candidates = products
    .map((product) => {
      const text = [product.name, product.unit, product.category.name, ...(product.tags ?? []), product.description].join(" ");
      const productTokens = tokenize(text);
      const overlap = queryTokens.filter((token) => productTokens.includes(token)).length;
      const exact = normalizeCommerceText(text).includes(normalizeCommerceText(expanded)) ? 0.36 : 0;
      const packageMatch = /\b(500|250|1kg|kg|ml|packet|blue|green)\b/i.test(input) && /\b(500|250|1kg|kg|ml|packet|blue|green)\b/i.test(text) ? 0.14 : 0;
      const coverage = overlap / Math.max(1, queryTokens.length);
      const score = clamp(exact + coverage * 0.62 + packageMatch + (product.stockCount > 0 ? 0.05 : 0));
      return { productId: product.id, name: product.name, score: round(score, 3), reasons: [exact ? "alias-text-match" : "token-overlap", packageMatch ? "packaging-signal" : "semantic-signal"] };
    })
    .filter((candidate) => candidate.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const winner = candidates[0];
  const runnerUp = candidates[1];
  const ambiguous = !winner || winner.score < 0.58 || Boolean(runnerUp && winner.score - runnerUp.score < 0.12);
  return {
    input,
    canonicalProductId: ambiguous ? undefined : winner.productId,
    canonicalName: ambiguous ? undefined : winner.name,
    variantMatch: input.match(/\b\d+\s*(ml|g|kg|l|packet)\b/i)?.[0],
    confidence: round(winner?.score ?? 0, 3),
    ambiguous,
    candidates,
    corrections: expanded !== input ? [expanded] : [],
  };
}

export function analyzeImage(input: AiCommerceAutomationInput): AiImageAnalysis | undefined {
  if (!input.image) return undefined;
  const image = input.image;
  const blur = image.blurScore ?? 0.12;
  const brightness = image.brightnessScore ?? 0.72;
  const compression = image.compressionScore ?? 0.18;
  const packagingVisibility = clamp((image.width * image.height) / 900_000 - blur * 0.42 + brightness * 0.28 - compression * 0.24);
  const quality = clamp(0.82 - blur * 0.45 - Math.abs(0.68 - brightness) * 0.28 - compression * 0.24 + Math.min(0.12, (image.width + image.height) / 8000));
  const text = image.detectedText ?? [];
  const issues: AiImageAnalysis["issues"] = [];
  if (blur > 0.45) issues.push("blurry");
  if (brightness < 0.34) issues.push("low_light");
  if (compression > 0.55) issues.push("compressed");
  if (packagingVisibility < 0.45) issues.push("cropped_packaging");
  if (text.length > 4) issues.push("multiple_products");
  const seed = image.perceptualSeed ?? `${image.width}:${image.height}:${text.join("|")}`;
  return {
    imageId: image.id,
    packagingVisibilityScore: round(packagingVisibility, 3),
    imageQualityScore: round(quality, 3),
    duplicateConfidence: round(clamp((image.perceptualSeed ? 0.46 : 0.12) + (text.length ? 0.08 : 0)), 3),
    packagingTextExtraction: text,
    categoryHints: [...new Set(text.map(inferCategory))].slice(0, 4),
    perceptualHash: `phash-${hashText(seed).slice(0, 12)}`,
    packagingFingerprint: `pkg-${hashText(text.join(":") || seed).slice(0, 12)}`,
    issues,
    moderationRequired: quality < 0.66 || packagingVisibility < 0.55 || issues.length > 0,
  };
}

export function generateCatalogDrafts(input: AiCommerceAutomationInput, items: ParsedCommerceLineItem[], matches: AiProductMatch[], image?: AiImageAnalysis): AiCatalogDraft[] {
  return items
    .filter((item, index) => matches[index]?.ambiguous ?? true)
    .map((item) => {
      const categorySlug = inferCategory(`${item.productName} ${image?.categoryHints.join(" ") ?? ""}`);
      const confidence = clamp(item.confidence * 0.62 + (image ? image.imageQualityScore * 0.18 : 0.08) + (categorySlug !== "general-grocery" ? 0.12 : 0));
      return {
        draftId: `draft-${hashText(`${item.rawText}:${categorySlug}`)}`,
        source: input.source,
        title: item.productName,
        categorySlug,
        brand: item.productName.match(/\b(aavin|nandini|milma|heritage|amul)\b/i)?.[1],
        variants: [{ label: `${item.quantity} ${item.unitText}`, quantity: item.quantity, unit: item.unit, price: item.price }],
        aliases: [...new Set([...item.aliases, item.productName.toLowerCase()])].slice(0, 10),
        searchTokens: tokenize(item.productName).slice(0, 12),
        multilingualTags: detectLanguages(item.rawText).flatMap((language) => [`${language}:${item.productName.toLowerCase()}`]),
        metadata: { locality: input.locality ?? input.seller?.locality ?? "unknown", humanReviewRequired: true },
        confidence: round(confidence, 3),
        moderationState: "needs_review",
        rollbackToken: `rollback:${hashText(item.rawText)}`,
        safetyFlags: confidence < 0.62 ? ["low_confidence"] : [],
      };
    });
}

function detectDuplicateClusters(products: Product[], matches: AiProductMatch[], image?: AiImageAnalysis) {
  const matchedIds = matches.flatMap((match) => match.candidates.filter((candidate) => candidate.score > 0.5).map((candidate) => candidate.productId));
  const clusters = [...new Set(matchedIds)].flatMap((id) => {
    const product = products.find((item) => item.id === id);
    const siblings = product ? products.filter((item) => item.id !== id && normalizeCommerceText(item.name) === normalizeCommerceText(product.name)).map((item) => item.id) : [];
    return siblings.length ? [{ clusterId: `dup-${hashText([id, ...siblings].join(":"))}`, productIds: [id, ...siblings], confidence: 0.86, reason: "same normalized product name" }] : [];
  });
  if (image && image.duplicateConfidence > 0.5) {
    const productIds = matchedIds.length > 1 ? matchedIds.slice(0, 3) : products.slice(0, 2).map((product) => product.id);
    clusters.push({ clusterId: `dup-img-${image.perceptualHash}`, productIds, confidence: image.duplicateConfidence, reason: "near-identical packaging fingerprint" });
  }
  return clusters.filter((cluster) => cluster.productIds.length > 1);
}

function classifyShop(text: string): SellerShopType {
  const normalized = text.toLowerCase();
  if (/bakery|bread|bun|cake|batter/.test(normalized)) return "bakery";
  if (/tea|coffee|kaapi|snack/.test(normalized)) return "tea_kadai";
  if (/fish|meen|seafood/.test(normalized)) return "fish_market";
  if (/medicine|tablet|pharmacy/.test(normalized)) return "pharmacy";
  if (/vegetable|onion|tomato|greens|banana/.test(normalized)) return "vegetable_shop";
  if (/flower|pooja|malligai/.test(normalized)) return "pooja_store";
  if (/grocery|rice|dal|milk/.test(normalized)) return "kirana";
  return "unknown";
}

function buildSellerSuggestions(input: AiCommerceAutomationInput, items: ParsedCommerceLineItem[], image?: AiImageAnalysis): AiSellerSuggestion[] {
  const sellerId = input.seller?.id ?? "unknown-seller";
  const suggestions: AiSellerSuggestion[] = [];
  for (const item of items) {
    if (item.confidence < 0.68) {
      suggestions.push({ id: `suggest-catalog-${hashText(item.rawText)}`, sellerId, type: "catalog", title: "Review AI product draft", action: `Confirm name, unit, and price for ${item.productName}.`, priority: "medium", confidence: item.confidence });
    }
    if (/(fish|flower|milk|bakery|greens)/i.test(item.productName)) {
      suggestions.push({ id: `suggest-expiry-${hashText(item.rawText)}`, sellerId, type: "expiry", title: "Watch freshness window", action: `Set same-day expiry and consider early clearance for ${item.productName}.`, priority: "high", confidence: 0.78 });
    }
  }
  if (image?.moderationRequired) {
    suggestions.push({ id: `suggest-image-${image.imageId}`, sellerId, type: "image_quality", title: "Retake product photo", action: "Use brighter light and keep the package label fully visible.", priority: "medium", confidence: image.imageQualityScore });
  }
  const shopType = classifyShop([input.seller?.name, input.text, ...items.map((item) => item.productName)].join(" "));
  if (shopType !== "unknown") {
    suggestions.push({ id: `suggest-onboarding-${shopType}`, sellerId, type: "onboarding", title: "Use shop starter template", action: `Apply ${shopType.replace("_", " ")} inventory template with common local items.`, priority: "low", confidence: 0.74 });
  }
  return suggestions;
}

function buildSafetyAssessment(drafts: AiCatalogDraft[], matches: AiProductMatch[], image?: AiImageAnalysis): AiSafetyAssessment {
  const hallucinationRisk = clamp(drafts.filter((draft) => draft.confidence < 0.62).length / Math.max(1, drafts.length));
  const counterfeitRisk = clamp((image?.duplicateConfidence ?? 0) * 0.52 + (image?.issues.includes("reflective_packaging") ? 0.18 : 0));
  const fakePricingRisk = clamp(drafts.filter((draft) => Number(draft.variants[0]?.price ?? 0) > 5000).length / Math.max(1, drafts.length));
  const policyRisk = drafts.some((draft) => /tobacco|alcohol|knife|drug/i.test(draft.title)) ? 0.9 : 0.08;
  const unsafeSubstitutionRisk = matches.some((match) => match.ambiguous && match.confidence > 0.45) ? 0.42 : 0.12;
  const confidenceScore = clamp(1 - (hallucinationRisk * 0.28 + policyRisk * 0.26 + counterfeitRisk * 0.18 + fakePricingRisk * 0.14 + unsafeSubstitutionRisk * 0.14));
  return {
    confidenceScore: round(confidenceScore, 3),
    hallucinationRisk: round(hallucinationRisk, 3),
    policyRisk: round(policyRisk, 3),
    counterfeitRisk: round(counterfeitRisk, 3),
    unsafeSubstitutionRisk: round(unsafeSubstitutionRisk, 3),
    fakePricingRisk: round(fakePricingRisk, 3),
    moderationState: confidenceScore > 0.86 && policyRisk < 0.4 && hallucinationRisk < 0.2 ? "needs_review" : "needs_review",
    thresholds: { autoPublishAllowed: 0, reviewRequiredBelow: 1, rejectPolicyRiskAt: 0.82 },
    auditEvents: ["ai-output-created", "auto-publish-blocked", "moderation-required", "rollback-token-issued"],
  };
}

function buildAsyncJobs(input: AiCommerceAutomationInput): AiAutomationJob[] {
  const scope = `${input.seller?.id ?? "seller"}:${input.locality ?? input.seller?.locality ?? "locality"}:${input.source}`;
  return [
    ["tier4.ocr.process", "ai-heavy-compute"],
    ["tier4.image.analyze", "ai-heavy-compute"],
    ["tier4.duplicate.scan", "analytics-bulk"],
    ["tier4.catalog.generate", "governance-risk"],
    ["tier4.whatsapp.parse", "commerce-critical"],
    ["tier4.spoilage.predict", "analytics-bulk"],
    ["tier4.seller.suggest", "notification-delivery"],
  ].map(([jobName, queueName]) => ({
    jobName,
    queueName,
    idempotencyKey: `${jobName}:${hashText(scope)}`,
    replaySafe: true,
    maxAttempts: 4,
    payload: { source: input.source, locality: input.locality ?? input.seller?.locality ?? "unknown", sellerId: input.seller?.id ?? "unknown" },
  })) as AiAutomationJob[];
}

export function buildAiCommerceAutomationSnapshot(input: AiCommerceAutomationInput): AiCommerceAutomationSnapshot {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const ocr = analyzeOcrDocument(input);
  const whatsapp = parseWhatsappCommerce(input);
  const items = ocr.lineItems.length ? ocr.lineItems : whatsapp.lineItems;
  const productMatches = items.map((item) => matchProducts(item.productName, input.products));
  const imageAnalysis = analyzeImage(input);
  const catalogDrafts = generateCatalogDrafts(input, items, productMatches, imageAnalysis);
  const duplicateClusters = detectDuplicateClusters(input.products, productMatches, imageAnalysis);
  const sellerSuggestions = buildSellerSuggestions(input, items, imageAnalysis);
  const searchPlan = buildSemanticDiscoveryPlan(input.text ?? items[0]?.productName ?? "nearby products", "en", true, { locality: input.locality });
  const operations = buildHyperlocalOperationsSnapshot({
    products: input.products,
    context: {
      locality: input.locality ?? input.seller?.locality ?? "Unknown",
      city: input.seller?.city ?? "Unknown",
      now: input.now,
      weather: "normal",
    },
  });
  const dataCleanup = duplicateClusters.map((cluster) => ({ targetId: cluster.clusterId, issue: "duplicate cluster needs review", suggestedFix: "Queue manual merge review, never auto-delete seller catalog data.", confidence: cluster.confidence }));
  const operationalIntelligence = operations.risks.slice(0, 5).map((risk) => ({
    domain: risk.domain === "seller" ? "seller" : risk.domain === "delivery" ? "delivery" : risk.domain === "fraud" ? "fraud" : risk.domain === "saturation" ? "locality" : "demand",
    title: risk.title,
    risk: risk.level,
    confidence: 0.72,
  })) as AiCommerceAutomationSnapshot["operationalIntelligence"];
  const safety = buildSafetyAssessment(catalogDrafts, productMatches, imageAnalysis);

  return {
    generatedAt,
    ocr,
    whatsapp,
    productMatches,
    catalogDrafts,
    imageAnalysis,
    duplicateClusters,
    sellerSuggestions,
    voiceFoundation: {
      transcript: whatsapp.voiceReadyTranscript ?? input.text ?? "",
      intent: whatsapp.intent,
      matchConfidence: whatsapp.confidence,
      languageHints: ocr.languageHints,
    },
    searchExpansion: {
      query: searchPlan.normalizedQuery,
      expandedTerms: searchPlan.diagnostics.expansions,
      intent: whatsapp.intent,
      confidence: searchPlan.confidenceFloor,
    },
    dataCleanup,
    operationalIntelligence,
    safety,
    moderationReviews: catalogDrafts.map((draft) => ({ reviewId: `review-${draft.draftId}`, subjectType: "catalog_draft", subjectId: draft.draftId, state: "needs_review", reason: "AI-generated commerce data requires human approval before activation." })),
    asyncJobs: buildAsyncJobs(input),
    embeddings: {
      documentVectors: [`doc:${ocr.documentId}`],
      imageVectors: imageAnalysis ? [`image:${imageAnalysis.imageId}:${imageAnalysis.perceptualHash}`] : [],
      productMatchVectors: productMatches.map((match) => `match:${hashText(match.input)}`),
      sellerAssistVectors: sellerSuggestions.map((suggestion) => `assist:${suggestion.sellerId}:${suggestion.type}`),
      operationalVectors: operations.aiReadiness.operationalEmbeddings,
    },
  };
}
