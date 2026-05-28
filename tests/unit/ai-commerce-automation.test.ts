import { describe, expect, it } from "vitest";
import {
  analyzeImage,
  analyzeOcrDocument,
  buildAiCommerceAutomationSnapshot,
  matchProducts,
  parseWhatsappCommerce,
} from "@/lib/ai-commerce-automation";
import { ProductStatus } from "@/types";
import { createProduct, createVendor } from "../utils/fixtures";

const seller = createVendor({
  id: "seller-tier4-mylapore",
  name: "Mylapore Milk Flower Stores",
  locality: "Mylapore",
  city: "Chennai",
});

function products() {
  return [
    createProduct({
      id: "prod-aavin-500",
      name: "Aavin Standard Milk 500ml",
      slug: "aavin-standard-milk-500ml",
      vendor: seller,
      category: { id: "cat-dairy", name: "Dairy", slug: "dairy" },
      tags: ["aavin", "blue", "milk", "paal", "500 ml"],
      unit: "500 ml",
      price: 26,
      stockCount: 18,
    }),
    createProduct({
      id: "prod-flower",
      name: "Fresh Malligai Poo String",
      slug: "fresh-malligai-poo-string",
      vendor: seller,
      category: { id: "cat-pooja", name: "Pooja Items", slug: "pooja-items" },
      tags: ["flower", "malligai", "pooja"],
      unit: "string",
      price: 80,
      stockCount: 4,
    }),
    createProduct({
      id: "prod-fish",
      name: "Fresh Seer Fish Pieces",
      slug: "fresh-seer-fish",
      vendor: createVendor({ id: "seller-fish", name: "Coastal Fish Market", locality: "Mylapore", city: "Chennai" }),
      category: { id: "cat-fish", name: "Meat Seafood", slug: "meat-seafood" },
      tags: ["fish", "meen", "seafood"],
      price: 420,
      stockCount: 3,
      status: ProductStatus.Active,
    }),
  ];
}

describe("Tier 4 AI commerce automation", () => {
  it("extracts noisy OCR line items from mixed-language informal invoices", () => {
    const ocr = analyzeOcrDocument({
      source: "ocr_document",
      seller,
      locality: "Mylapore",
      products: products(),
      text: "Seller: Mylapore Stores\npaal 500ml 2 rs 52\nmalligai kattu 1 rs 80\nmeen 1kg rs 420 ~~",
      now: new Date("2026-05-28T09:00:00+05:30"),
    });

    expect(ocr.lineItems.length).toBeGreaterThanOrEqual(3);
    expect(ocr.languageHints).toContain("ta");
    expect(ocr.needsHumanReview).toBe(true);
    expect(ocr.auditTrail).toContain("human-review-gate-enforced");
  });

  it("parses WhatsApp-native commerce into structured order and inventory events", () => {
    const order = parseWhatsappCommerce({
      source: "whatsapp_text",
      seller,
      products: products(),
      text: "send 2kg onion and 1 milk",
      locality: "Mylapore",
    });
    const stock = parseWhatsappCommerce({
      source: "whatsapp_text",
      seller,
      products: products(),
      text: "fresh fish available today rate 420",
      locality: "Mylapore",
    });

    expect(order.intent).toBe("order_request");
    expect(order.structuredEvent.type).toBe("order");
    expect(stock.intent).toBe("price_update");
    expect(stock.replayKey).toMatch(/^wa:/);
  });

  it("matches slang and packaging references to canonical products with ambiguity controls", () => {
    const match = matchProducts("aavin blue 500 milk", products());
    const ambiguous = matchProducts("fresh packet", products());

    expect(match.canonicalProductId).toBe("prod-aavin-500");
    expect(match.confidence).toBeGreaterThan(0.55);
    expect(ambiguous.ambiguous).toBe(true);
  });

  it("scores blurry WhatsApp-compressed seller images and flags moderation", () => {
    const image = analyzeImage({
      source: "seller_image",
      seller,
      products: products(),
      image: {
        id: "img-blurry-milk",
        width: 640,
        height: 480,
        blurScore: 0.72,
        brightnessScore: 0.28,
        compressionScore: 0.68,
        perceptualSeed: "aavin-blue-front",
        detectedText: ["AAVIN", "500ml", "milk"],
      },
    });

    expect(image?.issues).toContain("blurry");
    expect(image?.issues).toContain("low_light");
    expect(image?.imageQualityScore).toBeLessThan(0.55);
    expect(image?.moderationRequired).toBe(true);
  });

  it("generates review-gated catalog drafts, duplicate clusters, seller suggestions, and safety trails", () => {
    const snapshot = buildAiCommerceAutomationSnapshot({
      source: "whatsapp_image",
      seller,
      locality: "Mylapore",
      products: [
        ...products(),
        createProduct({ id: "prod-aavin-copy", name: "Aavin Standard Milk 500ml", slug: "aavin-standard-milk-500ml-copy", vendor: seller }),
      ],
      text: "new item: bakery bread packet 2 rs 60\nold fish clearance rs 300",
      image: {
        id: "img-shelf",
        width: 720,
        height: 720,
        blurScore: 0.38,
        brightnessScore: 0.58,
        compressionScore: 0.45,
        perceptualSeed: "same-aavin-packaging",
        detectedText: ["Bread", "Milk", "AAVIN", "500ml", "Fish"],
      },
      now: new Date("2026-05-28T10:00:00+05:30"),
    });

    expect(snapshot.catalogDrafts.length).toBeGreaterThan(0);
    expect(snapshot.catalogDrafts.every((draft) => draft.moderationState === "needs_review")).toBe(true);
    expect(snapshot.moderationReviews.length).toBe(snapshot.catalogDrafts.length);
    expect(snapshot.safety.auditEvents).toContain("auto-publish-blocked");
    expect(snapshot.duplicateClusters.some((cluster) => cluster.confidence > 0.5)).toBe(true);
    expect(snapshot.sellerSuggestions.some((suggestion) => suggestion.type === "expiry")).toBe(true);
  });

  it("prepares voice, search expansion, operational intelligence, embeddings, and replay-safe queues", () => {
    const snapshot = buildAiCommerceAutomationSnapshot({
      source: "voice_note",
      seller,
      locality: "Mylapore",
      products: products(),
      text: "send milk and fish fry masala",
      now: new Date("2026-05-28T11:00:00+05:30"),
    });

    expect(snapshot.voiceFoundation.intent).toBe("order_request");
    expect(snapshot.searchExpansion.query).toContain("send milk");
    expect(snapshot.operationalIntelligence.length).toBeGreaterThan(0);
    expect(snapshot.embeddings.documentVectors.length).toBe(1);
    expect(snapshot.asyncJobs.map((job) => job.jobName)).toContain("tier4.ocr.process");
    expect(snapshot.asyncJobs.every((job) => job.replaySafe && job.maxAttempts >= 4)).toBe(true);
  });
});
