import { describe, expect, it } from "vitest";
import { buildDiscoveryProductDocument, buildHyperlocalAutocomplete, searchHyperlocalCommerce, understandCommerceQuery } from "@/lib/hyperlocal-discovery";
import { ProductStatus } from "@/types";
import { createProduct, createVendor, reliabilityBuyerLocation } from "../utils/fixtures";

const chennaiLocation = {
  ...reliabilityBuyerLocation,
  id: "buyer-t-nagar",
  locality: "T. Nagar",
  city: "Chennai",
  latitude: 13.0418,
  longitude: 80.2341,
};

function discoveryProducts() {
  const chennaiSeller = createVendor({
    id: "vendor-chennai-fresh",
    name: "T Nagar Morning Market",
    locality: "T. Nagar",
    city: "Chennai",
    serviceRadiusKm: 5,
    fulfillmentPromiseMinutes: 18,
  });

  return [
    createProduct({
      id: "prod-sambar-onion",
      slug: "sambar-onion",
      name: "Sambar Onion Small Shallots",
      vendor: chennaiSeller,
      category: { id: "cat-veg", name: "Fresh Vegetables", slug: "fresh-produce" },
      tags: ["chinna vengayam", "small onion", "sambar", "fresh"],
      stockCount: 20,
      deliveryMinutes: 18,
    }),
    createProduct({
      id: "prod-dosa-batter",
      slug: "amma-dosa-maavu",
      name: "Amma Dosa Maavu",
      vendor: chennaiSeller,
      category: { id: "cat-breakfast", name: "Breakfast", slug: "bakery-breakfast" },
      tags: ["dosa batter", "idli batter", "quick breakfast"],
      stockCount: 12,
      deliveryMinutes: 16,
    }),
    createProduct({
      id: "prod-pooja-flowers",
      slug: "pooja-flowers",
      name: "Fresh Pooja Flowers",
      vendor: chennaiSeller,
      category: { id: "cat-pooja", name: "Pooja Items", slug: "pooja-items" },
      tags: ["malligai", "jasmine", "diwali", "fresh"],
      stockCount: 9,
      deliveryMinutes: 14,
    }),
    createProduct({
      id: "prod-mobile-cover",
      slug: "mobile-cover",
      name: "Mobile Cover",
      vendor: createVendor({ id: "vendor-electronics", locality: "Velachery", city: "Chennai" }),
      category: { id: "cat-mobile", name: "Mobile Accessories", slug: "electronics" },
      tags: ["phone case"],
      stockCount: 6,
      status: ProductStatus.Active,
    }),
  ];
}

describe("hyperlocal discovery engine", () => {
  it("resolves South Indian slang, fuzzy spellings, and recipe intent", () => {
    const result = searchHyperlocalCommerce("kothmaly and sambar onion", discoveryProducts(), {
      buyerLocation: chennaiLocation,
      language: "romanized",
    });

    expect(result.query.aliasGroups).toContain("small onion");
    expect(result.query.intents).toContain("recipe");
    expect(result.results[0]?.product.id).toBe("prod-sambar-onion");
    expect(result.analytics.slangDetected).toBe(true);
  });

  it("boosts time-sensitive breakfast and voice-like local queries", () => {
    const result = searchHyperlocalCommerce("amma dosa maavu quick breakfast", discoveryProducts(), {
      buyerLocation: chennaiLocation,
      now: new Date("2026-05-28T07:30:00+05:30"),
    });

    expect(result.query.voiceLike).toBe(true);
    expect(result.results[0]?.product.id).toBe("prod-dosa-batter");
    expect(result.results[0]?.rankSignals.time).toBeGreaterThan(0.8);
  });

  it("understands festival and perishability signals for pooja commerce", () => {
    const result = searchHyperlocalCommerce("pooja flowers Chennai", discoveryProducts(), {
      buyerLocation: chennaiLocation,
      festival: "diwali",
    });

    expect(result.query.intents).toContain("pooja");
    expect(result.results[0]?.product.id).toBe("prod-pooja-flowers");
    expect(result.results[0]?.rankSignals.perishability).toBeGreaterThan(0.9);
    expect(result.recommendations.festivalBased[0]?.id).toBe("prod-pooja-flowers");
  });

  it("creates vector-ready product documents with mandatory search token families", () => {
    const document = buildDiscoveryProductDocument(discoveryProducts()[0]);

    expect(document.tokens.search_tokens).toContain("sambar");
    expect(document.tokens.phonetic_tokens.length).toBeGreaterThan(0);
    expect(document.tokens.fuzzy_tokens.length).toBeGreaterThan(0);
    expect(document.tokens.transliteration_tokens).toContain("chinna vengayam");
    expect(document.semanticEmbeddingId).toBe("product:prod-sambar-onion:commerce-intent");
    expect(document.vectorIndexKey).toContain("hyperlocal:Chennai:T. Nagar");
  });

  it("offers autocomplete across products, slang, recipes, festival, and time windows", () => {
    const suggestions = buildHyperlocalAutocomplete("sam", discoveryProducts(), {
      festival: "pongal",
      now: new Date("2026-05-28T08:00:00+05:30"),
    });

    expect(suggestions).toContain("sambar onion");
    expect(suggestions).toContain("sambar");
  });

  it("records failed search learning signals for missing regional demand", () => {
    const query = understandCommerceQuery("rare temple prasadam box", { buyerLocation: chennaiLocation });
    const result = searchHyperlocalCommerce(query.originalQuery, discoveryProducts(), { buyerLocation: chennaiLocation });

    expect(result.analytics.heatmapKey).toContain("T. Nagar");
    expect(result.analytics.resultCount).toBe(0);
    expect(result.analytics.failed).toBe(true);
  });
});
