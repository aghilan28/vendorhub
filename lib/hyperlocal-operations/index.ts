import type {
  BasketAffinityInsight,
  BuildOperationsInput,
  DeliveryIntelligenceDecision,
  DemandForecastOutput,
  DistressPricingRecommendation,
  DynamicPricingDecision,
  FreshnessDecayProfile,
  GeoCommerceProfile,
  HyperlocalOperationsSnapshot,
  InventoryOperationalState,
  OperationalAlertEvent,
  OperationalAsyncJob,
  OperationalInventoryRecord,
  OperationalRiskSignal,
  OperationsContext,
  PerishabilityClass,
  PerishabilityDecision,
  RealtimeTelemetryEvent,
  RiskLevel,
  SellerOperationsProfile,
} from "@/types/hyperlocal-operations";
import type { Product, Vendor } from "@/types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function hoursBetween(from: Date, to: Date) {
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3_600_000).toISOString();
}

function hoursUntil(from: Date, iso?: string | null) {
  return iso ? hoursBetween(from, new Date(iso)) : 999;
}

function productText(product: Product) {
  return [product.name, product.description, product.category.name, product.category.slug, ...(product.tags ?? []), ...(product.trustSignals ?? [])].join(" ").toLowerCase();
}

function inferPerishability(product: Product): { class: PerishabilityClass; shelfLifeHours: number; looseUnit?: OperationalInventoryRecord["loose_inventory"] } {
  const text = productText(product);
  if (/(fish|meat|seafood)/.test(text)) return { class: "ultra_fresh", shelfLifeHours: 8, looseUnit: { unit: "piece", confidence: 0.78 } };
  if (/(flower|garland|greens|keerai|milk)/.test(text)) return { class: "same_day", shelfLifeHours: 12, looseUnit: text.includes("flower") ? { unit: "string", confidence: 0.8 } : undefined };
  if (/(batter|bakery|paneer|curd)/.test(text)) return { class: "cold_chain", shelfLifeHours: 24 };
  if (/(vegetable|banana|tomato|fruit|fresh)/.test(text)) return { class: "fresh", shelfLifeHours: 48, looseUnit: { unit: "kg", estimatedWeightGrams: 1000, confidence: 0.72 } };
  return { class: "ambient", shelfLifeHours: 720 };
}

function decayShape(perishability: PerishabilityClass) {
  if (perishability === "ultra_fresh") return 1.55;
  if (perishability === "same_day") return 1.32;
  if (perishability === "cold_chain") return 1.18;
  if (perishability === "fresh") return 1.08;
  return 0.62;
}

function climateStress(context: OperationsContext, perishability: PerishabilityClass) {
  const heat = context.weather === "hot" ? 0.18 : context.weather === "storm" ? 0.08 : 0;
  const heatIndex = context.heatIndexCelsius ? clamp((context.heatIndexCelsius - 30) / 18) * 0.22 : 0;
  const humidity = context.humidity ? clamp((context.humidity - 65) / 35) * 0.12 : 0;
  const transit = context.transitMinutes ? clamp(context.transitMinutes / 90) * 0.12 : 0;
  const refrigeration = context.refrigeration === "active" ? -0.18 : context.refrigeration === "passive" ? -0.08 : 0.06;
  const sensitivity = ["ultra_fresh", "same_day", "cold_chain"].includes(perishability) ? 1 : 0.45;
  return clamp((heat + heatIndex + humidity + transit + refrigeration) * sensitivity, -0.2, 0.58);
}

function freshnessScore(ageHours: number, shelfLifeHours: number, perishability: PerishabilityClass, context: OperationsContext) {
  const ageRatio = clamp(ageHours / Math.max(1, shelfLifeHours));
  const decay = Math.pow(ageRatio, decayShape(perishability));
  return clamp(1 - decay - climateStress(context, perishability));
}

function inventoryState(item: OperationalInventoryRecord): InventoryOperationalState {
  const available = Math.max(0, item.current_stock - item.reserved_stock);
  if (item.current_stock <= 0) return "unavailable";
  if (item.incoming_stock && available <= item.reorder_threshold) return "pending_restock";
  if (item.spoilage_risk >= 0.76 || item.freshness_score < 0.42) return "distressed";
  if (item.spoilage_risk >= 0.55 || item.freshness_score < 0.62) return "expiring";
  if (item.current_stock < item.reserved_stock) return "reserved";
  if (available <= Math.max(1, item.reorder_threshold * 0.45)) return "critical";
  if (available <= item.reorder_threshold) return "low_stock";
  return "healthy";
}

function riskLevel(score: number): RiskLevel {
  if (score >= 0.82) return "critical";
  if (score >= 0.62) return "high";
  if (score >= 0.38) return "medium";
  return "low";
}

function timeWindow(context: OperationsContext) {
  const hour = (context.now ?? new Date()).getHours();
  if (hour < 10) return "early_morning";
  if (hour < 15) return "midday";
  if (hour < 21) return "evening";
  return "late_night";
}

function temporalDemandBoost(product: Product, context: OperationsContext) {
  const text = productText(product);
  const window = timeWindow(context);
  if (window === "early_morning" && /(milk|flower|fish|greens|newspaper|breakfast|batter)/.test(text)) return 0.28;
  if (window === "midday" && /(grocery|rice|dal|vegetable|lunch)/.test(text)) return 0.16;
  if (window === "evening" && /(bakery|snack|tea|biscuit|dinner|batter)/.test(text)) return 0.3;
  if (window === "late_night" && /(hostel|noodle|beverage|ready)/.test(text)) return 0.24;
  return 0.06;
}

function festivalBoost(product: Product, context: OperationsContext) {
  const text = productText(product);
  const festival = context.festival ?? "none";
  const match =
    (festival === "pongal" && /(sugarcane|turmeric|rice|jaggery|pot)/.test(text)) ||
    (festival === "diwali" && /(sweet|lamp|diya|pooja|flower|ghee)/.test(text)) ||
    (festival === "onam" && /(banana leaf|flower|sadya|coconut|payasam)/.test(text)) ||
    (festival === "ramadan" && /(dates|juice|meat|rose milk|seviyan)/.test(text)) ||
    (festival === "temple_event" && /(pooja|flower|camphor|agarbathi)/.test(text)) ||
    (festival === "school_reopening" && /(stationery|school|snack|lunch box)/.test(text));
  return match ? 0.34 : festival === "salary_cycle" || context.salaryWindow ? 0.12 : 0;
}

function weatherBoost(product: Product, context: OperationsContext) {
  const text = productText(product);
  if (context.weather === "rainy" && /(snack|bajji|tea|biscuit|corn)/.test(text)) return 0.24;
  if (context.weather === "rainy" && /(tomato|vegetable)/.test(text)) return 0.12;
  if (context.weather === "hot" && /(milk|curd|juice|water|ice cream)/.test(text)) return 0.2;
  if (context.weather === "storm") return /(essential|rice|milk|bread|water)/.test(text) ? 0.28 : -0.06;
  return 0;
}

function localityDemandBase(product: Product, context: OperationsContext) {
  const sameLocality = product.vendor.locality === context.locality ? 0.18 : 0;
  const sameCity = product.vendor.city === context.city ? 0.12 : 0;
  const category = product.category.slug;
  const categoryBase = ["fresh-produce", "bakery-breakfast", "ready-meals", "pooja-items", "meat-seafood"].includes(category) ? 0.22 : 0.12;
  const reviewSignal = clamp((product.reviewCount ?? 0) / 320) * 0.16;
  return clamp(0.28 + sameLocality + sameCity + categoryBase + reviewSignal);
}

export function buildOperationalInventory(products: Product[], context: OperationsContext, overrides: Partial<OperationalInventoryRecord>[] = []): OperationalInventoryRecord[] {
  const now = context.now ?? new Date();
  const overrideByProduct = new Map(overrides.map((item) => [item.product_id, item]));

  return products.map((product) => {
    const perishable = inferPerishability(product);
    const override = overrideByProduct.get(product.id);
    const batch = override?.batch_time ? new Date(override.batch_time) : now;
    const expiry = override?.estimated_expiry ? new Date(override.estimated_expiry) : new Date(batch.getTime() + perishable.shelfLifeHours * 3_600_000);
    const ageHours = hoursBetween(batch, now);
    const ageRatio = clamp(ageHours / Math.max(1, perishable.shelfLifeHours));
    const freshness = override?.freshness_score ?? freshnessScore(ageHours, perishable.shelfLifeHours, perishable.class, context);
    const demand = override?.locality_demand_score ?? clamp(localityDemandBase(product, context) + temporalDemandBoost(product, context) + festivalBoost(product, context) + weatherBoost(product, context));
    const velocity = override?.inventory_velocity ?? round(Math.max(0.05, demand * 3.2 + (product.reviewCount ?? 0) / 220), 2);
    const available = Math.max(0, override?.current_stock ?? product.stockCount);
    const reserved = Math.max(0, override?.reserved_stock ?? Math.min(product.stockCount, Math.floor(product.stockCount * 0.12)));
    const spoilageRisk = override?.spoilage_risk ?? clamp(ageRatio * 0.58 + (1 - freshness) * 0.32 + (context.weather === "hot" ? 0.1 : 0));
    const selloutHours = velocity > 0 ? Math.max(1, (available - reserved) / velocity) : 999;
    const spoilageEtaHours = Math.max(0, hoursBetween(now, expiry));
    const localityPressure = clamp(demand * 0.62 + velocity / Math.max(1, available) * 0.38);
    const health = clamp(freshness * 0.34 + (1 - spoilageRisk) * 0.28 + clamp((available - reserved) / Math.max(1, (override?.reorder_threshold ?? Math.ceil(velocity * 4)) * 2)) * 0.24 + (1 - localityPressure) * 0.14);
    const enriched: OperationalInventoryRecord = {
      inventory_id: override?.inventory_id ?? `inv-${product.id}`,
      seller_id: override?.seller_id ?? product.vendor.id,
      product_id: product.id,
      variant_id: override?.variant_id ?? null,
      current_stock: available,
      reserved_stock: reserved,
      damaged_stock: override?.damaged_stock ?? 0,
      spoilage_stock: override?.spoilage_stock ?? Math.round(available * spoilageRisk * 0.08),
      incoming_stock: override?.incoming_stock ?? 0,
      freshness_score: round(freshness, 3),
      batch_time: batch.toISOString(),
      estimated_expiry: expiry.toISOString(),
      spoilage_risk: round(spoilageRisk, 3),
      last_restocked_at: override?.last_restocked_at ?? batch.toISOString(),
      reorder_threshold: override?.reorder_threshold ?? Math.max(3, Math.ceil(velocity * 4)),
      predicted_sellout_time: available > reserved ? addHours(now, selloutHours) : now.toISOString(),
      inventory_velocity: velocity,
      locality_demand_score: round(demand, 3),
      sales_velocity: round(velocity * clamp(0.72 + demand * 0.38, 0.5, 1.3), 2),
      restock_velocity: round(Math.max(0.02, (override?.incoming_stock ?? 0) / Math.max(1, hoursBetween(new Date(override?.last_restocked_at ?? batch), now) + 1)), 2),
      spoilage_velocity: round(Math.max(0.01, (available * spoilageRisk) / Math.max(1, spoilageEtaHours || 1)), 2),
      locality_demand_velocity: round(demand * (context.dayType === "weekend" ? 1.16 : 1) * (context.salaryWindow ? 1.12 : 1), 2),
      inventory_health_score: Math.round(health * 100),
      sellout_eta_hours: round(selloutHours, 2),
      spoilage_eta_hours: round(spoilageEtaHours, 2),
      freshness_confidence: round(clamp(0.52 + freshness * 0.26 + (perishable.class === "ambient" ? 0.12 : 0) - climateStress(context, perishable.class) * 0.25), 3),
      locality_pressure_score: round(localityPressure, 3),
      loose_inventory: override?.loose_inventory ?? perishable.looseUnit,
    };

    return { ...enriched, inventory_state: inventoryState(enriched) };
  });
}

export function buildDemandForecasts(products: Product[], inventory: OperationalInventoryRecord[], context: OperationsContext): DemandForecastOutput[] {
  const inventoryByProduct = new Map(inventory.map((item) => [item.product_id, item]));
  return products.map((product) => {
    const inv = inventoryByProduct.get(product.id);
    const demandScore = inv?.locality_demand_score ?? localityDemandBase(product, context);
    const hourly = round(Math.max(0.05, demandScore * 2.8 + temporalDemandBoost(product, context) * 1.8 + festivalBoost(product, context) * 2), 2);
    const dayMultiplier = context.dayType === "weekend" ? 1.14 : 1;
    const salaryMultiplier = context.salaryWindow ? 1.12 : 1;
    const daily = round(hourly * 10 * dayMultiplier * salaryMultiplier, 1);
    const available = Math.max(0, (inv?.current_stock ?? product.stockCount) - (inv?.reserved_stock ?? 0));
    const coverHours = available / Math.max(0.05, hourly);
    const stockRisk = coverHours < 3 ? "critical" : coverHours < 8 ? "high" : coverHours < 18 ? "medium" : "low";
    const spike = festivalBoost(product, context) > 0.25 || weatherBoost(product, context) > 0.2 || temporalDemandBoost(product, context) > 0.25;
    const curve = Array.from({ length: 24 }, (_, hour) => {
      const hourBoost = hour < 10 ? 1.18 : hour < 15 ? 0.82 : hour < 21 ? 1.08 : 0.62;
      const weekendBoost = context.dayType === "weekend" && hour >= 17 ? 1.12 : 1;
      return round(hourly * hourBoost * weekendBoost, 2);
    });
    const temporalDemandProfile = {
      early_morning: round(hourly * 1.2, 2),
      midday: round(hourly * 0.84, 2),
      evening: round(hourly * 1.18, 2),
      late_night: round(hourly * 0.58, 2),
    };

    return {
      productId: product.id,
      locality: context.locality,
      predictedHourlySales: hourly,
      predictedDailySales: daily,
      demandSpike: spike,
      stockRisk,
      replenishmentAlert: stockRisk === "critical" || stockRisk === "high" ? `Replenish ${product.name} before the next ${timeWindow(context)} demand window.` : null,
      surgeAlert: spike ? `${product.name} has local surge pressure from time, weather, or festival context.` : null,
      confidence: round(clamp(0.48 + demandScore * 0.32 + (product.reviewCount ?? 0) / 1000), 2),
      demandCurve: curve,
      surgeProbability: round(clamp((spike ? 0.42 : 0.12) + demandScore * 0.34 + (context.salaryWindow ? 0.1 : 0)), 3),
      temporalDemandProfile,
      localityDemandProjection: round(daily * clamp(0.7 + demandScore, 0.7, 1.55), 1),
      factors: [
        `locality:${context.locality}`,
        `weather:${context.weather ?? "normal"}`,
        `festival:${context.festival ?? "none"}`,
        `time:${timeWindow(context)}`,
        `stock:${available}`,
      ],
    };
  });
}

export function buildFreshnessProfiles(products: Product[], inventory: OperationalInventoryRecord[], context: OperationsContext): FreshnessDecayProfile[] {
  const invByProduct = new Map(inventory.map((item) => [item.product_id, item]));
  const now = context.now ?? new Date();
  return products.map((product) => {
    const perishable = inferPerishability(product);
    const inv = invByProduct.get(product.id);
    const ageHours = inv ? hoursBetween(new Date(inv.batch_time), now) : 0;
    const stress = climateStress(context, perishable.class);
    const adjustedShelfLife = Math.max(2, perishable.shelfLifeHours * (1 - stress * 0.72));
    const freshness = inv?.freshness_score ?? freshnessScore(ageHours, perishable.shelfLifeHours, perishable.class, context);
    const curve = Array.from({ length: 8 }, (_, index) => {
      const ratio = index / 7;
      return round(clamp(1 - Math.pow(ratio, decayShape(perishable.class)) - Math.max(0, stress) * ratio), 3);
    });
    const threshold = perishable.class === "ultra_fresh" ? 35 : perishable.class === "same_day" ? 55 : perishable.class === "cold_chain" ? 70 : 120;
    return {
      productId: product.id,
      perishabilityClass: perishable.class,
      shelfLifeHours: perishable.shelfLifeHours,
      decayCurve: curve,
      climateAdjustedShelfLifeHours: round(adjustedShelfLife, 2),
      freshnessScore: round(freshness, 3),
      spoilageProbability: round(inv?.spoilage_risk ?? clamp(1 - freshness + stress * 0.24), 3),
      freshnessEtaHours: round(Math.max(0, adjustedShelfLife - ageHours), 2),
      heatDamageRisk: round(clamp(stress + (context.weather === "hot" ? 0.18 : 0)), 3),
      deliveryFreshnessThresholdMinutes: threshold,
      freshnessRankBoost: round(clamp(freshness * 0.54 + (product.vendor.locality === context.locality ? 0.22 : 0) - stress * 0.18), 3),
    };
  });
}

export function buildDynamicPricing(products: Product[], inventory: OperationalInventoryRecord[], forecasts: DemandForecastOutput[], context: OperationsContext): DynamicPricingDecision[] {
  const invByProduct = new Map(inventory.map((item) => [item.product_id, item]));
  const forecastByProduct = new Map(forecasts.map((item) => [item.productId, item]));
  return products.map((product) => {
    const inv = invByProduct.get(product.id);
    const forecast = forecastByProduct.get(product.id);
    const supplyPressure = forecast?.stockRisk === "critical" ? 0.18 : forecast?.stockRisk === "high" ? 0.1 : 0;
    const distress = inv && inv.spoilage_risk > 0.78 ? -0.34 : inv && inv.spoilage_risk > 0.62 ? -0.24 : inv && inv.freshness_score < 0.55 ? -0.16 : 0;
    const climate = context.weather === "storm" ? 0.08 : context.weather === "rainy" ? weatherBoost(product, context) * 0.3 : 0;
    const festival = festivalBoost(product, context) * 0.32;
    const intraday = /(fish|flower|bakery)/.test(productText(product)) && timeWindow(context) === "late_night" ? -0.12 : temporalDemandBoost(product, context) * 0.18;
    const locality = clamp(localityDemandBase(product, context) - 0.55, -0.15, 0.2);
    const delta = clamp(supplyPressure + distress + climate + festival + intraday + locality, -0.3, 0.3);
    const recommendedPrice = Math.max(1, Math.round(product.price * (1 + delta)));
    const volatility = clamp(Math.abs(delta) + (forecast?.demandSpike ? 0.18 : 0) + (context.weather === "storm" ? 0.16 : 0));
    const manipulationRisk = recommendedPrice > product.price * 1.25 && forecast?.stockRisk !== "critical" ? "high" : volatility > 0.55 ? "medium" : "low";
    const markdown = delta < 0 ? Math.abs(Math.round(delta * 100)) : 0;
    const distressUrgency = riskLevel((inv?.spoilage_risk ?? 0) * 0.74 + (markdown / 40) * 0.26);

    return {
      productId: product.id,
      currentPrice: product.price,
      recommendedPrice,
      priceDeltaPercent: Math.round(delta * 100),
      volatilityScore: round(volatility, 3),
      manipulationRisk,
      pricingConfidence: round(clamp(0.72 - volatility * 0.24 + (forecast?.confidence ?? 0.5) * 0.22 - (manipulationRisk === "high" ? 0.18 : 0)), 3),
      markdownRecommendation: markdown,
      distressUrgency,
      signals: [
        supplyPressure > 0 ? "supply-demand pressure" : "normal supply",
        distress < 0 ? "distress markdown" : "freshness stable",
        festival > 0 ? "festival surge" : "no festival surge",
        climate > 0 ? "climate demand" : "normal climate",
      ],
      guardrail: "Decision support only; seller consent and anti-manipulation checks are required before price changes.",
    };
  });
}

export function buildPerishabilityOperations(products: Product[], inventory: OperationalInventoryRecord[], context: OperationsContext): PerishabilityDecision[] {
  const invByProduct = new Map(inventory.map((item) => [item.product_id, item]));
  return products.map((product) => {
    const perishable = inferPerishability(product);
    const inv = invByProduct.get(product.id);
    const spoilageRisk = inv?.spoilage_risk ?? 0;
    const deliveryUrgencyScore = spoilageRisk + (perishable.class === "ultra_fresh" ? 0.42 : perishable.class === "same_day" ? 0.34 : 0) + (context.weather === "hot" ? 0.1 : 0);
    const markdownPercent = spoilageRisk > 0.78 ? 35 : spoilageRisk > 0.62 ? 22 : spoilageRisk > 0.48 ? 12 : 0;
    return {
      productId: product.id,
      perishabilityClass: perishable.class,
      freshnessScore: inv?.freshness_score ?? 0.72,
      spoilageRisk,
      predictedSpoilageAt: inv?.estimated_expiry ?? addHours(context.now ?? new Date(), perishable.shelfLifeHours),
      distressSaleRecommended: markdownPercent > 0,
      markdownPercent,
      deliveryUrgency: riskLevel(deliveryUrgencyScore),
      freshnessEtaHours: round(hoursUntil(context.now ?? new Date(), inv?.estimated_expiry), 2),
      heatDamageRisk: round(clamp(climateStress(context, perishable.class) + (context.weather === "hot" ? 0.1 : 0)), 3),
      freshnessConfidence: round(inv?.freshness_confidence ?? clamp(0.56 + (inv?.freshness_score ?? 0.72) * 0.32), 3),
    };
  });
}

export function buildSellerOperationsProfiles(sellers: Vendor[], products: Product[], inventory: OperationalInventoryRecord[]): SellerOperationsProfile[] {
  return sellers.map((seller) => {
    const sellerProducts = products.filter((product) => product.vendor.id === seller.id);
    const sellerInventory = inventory.filter((item) => item.seller_id === seller.id);
    const stockAccuracy = sellerInventory.length ? clamp(sellerInventory.filter((item) => item.current_stock >= item.reserved_stock).length / sellerInventory.length) : 0.68;
    const freshnessQuality = sellerInventory.length ? sellerInventory.reduce((sum, item) => sum + item.freshness_score, 0) / sellerInventory.length : 0.62;
    const fulfillmentReliability = clamp((seller.rating / 5) * 0.52 + (seller.serviceStatus === "open" ? 0.24 : seller.serviceStatus === "busy" ? 0.12 : 0) + (seller.fulfillmentPromiseMinutes <= 30 ? 0.18 : 0.08));
    const deliveryTimeliness = clamp(1 - seller.fulfillmentPromiseMinutes / 90);
    const demandVelocity = clamp(sellerInventory.reduce((sum, item) => sum + item.inventory_velocity, 0) / Math.max(1, sellerProducts.length) / 4);
    const reorderPatternScore = clamp(sellerInventory.filter((item) => item.current_stock > item.reorder_threshold).length / Math.max(1, sellerInventory.length));
    const health = clamp((fulfillmentReliability + stockAccuracy + deliveryTimeliness + freshnessQuality + reorderPatternScore + demandVelocity) / 6);
    const riskScore = clamp(1 - health + (seller.serviceStatus === "closed" || seller.serviceStatus === "paused" ? 0.18 : 0));
    const grade = health >= 0.82 ? "A" : health >= 0.68 ? "B" : health >= 0.52 ? "C" : "D";
    const trend = freshnessQuality < 0.52 || stockAccuracy < 0.55 ? "degrading" : demandVelocity > 0.55 && reorderPatternScore > 0.55 ? "improving" : "stable";

    return {
      sellerId: seller.id,
      sellerName: seller.name,
      fulfillmentReliability: round(fulfillmentReliability, 3),
      stockAccuracy: round(stockAccuracy, 3),
      deliveryTimeliness: round(deliveryTimeliness, 3),
      freshnessQuality: round(freshnessQuality, 3),
      reorderPatternScore: round(reorderPatternScore, 3),
      demandVelocity: round(demandVelocity, 3),
      peakOperationalHours: sellerProducts.some((product) => /milk|flower|fish|breakfast/i.test(productText(product))) ? ["05:00-10:00", "17:00-20:00"] : ["10:00-14:00", "18:00-21:00"],
      sellerHealthScore: Math.round(health * 100),
      sellerRiskScore: Math.round(riskScore * 100),
      sellerOperationalGrade: grade,
      sellerReliabilityTrend: trend,
      riskLevel: riskLevel(riskScore),
      recoverySuggestions:
        health < 0.62
          ? ["Confirm live stock twice daily.", "Shorten delivery promise for nearby orders.", "Prioritize fresh batches in discovery."]
          : ["Maintain reorder rhythm.", "Protect peak-hour fulfillment quality."],
      sellerEmbeddingId: `seller:${seller.id}:operations`,
    };
  });
}

export function buildDeliveryIntelligence(products: Product[], context: OperationsContext): DeliveryIntelligenceDecision[] {
  return products.map((product) => {
    const perishable = inferPerishability(product);
    const distancePenalty = product.vendor.locality === context.locality ? 0.08 : product.vendor.city === context.city ? 0.18 : 0.36;
    const trafficPenalty = context.traffic === "heavy" ? 0.3 : context.traffic === "normal" ? 0.1 : 0.02;
    const rainPenalty = context.weather === "rainy" || context.weather === "storm" ? 0.18 : 0;
    const apartmentComplexity = /apartment|gated|tower|it corridor/i.test(context.locality) ? 0.12 : 0;
    const heatSensitivity = ["ultra_fresh", "same_day", "cold_chain"].includes(perishable.class);
    const ruralPenalty = context.ruralAccess ? 0.14 : 0;
    const festivalPenalty = context.festivalCongestion ? 0.14 : 0;
    const fragilityPenalty = /flower|glass|cake|bakery|egg/i.test(productText(product)) ? 0.1 : 0;
    const riskScore = distancePenalty + trafficPenalty + rainPenalty + apartmentComplexity + ruralPenalty + festivalPenalty + fragilityPenalty + (heatSensitivity ? 0.12 : 0) + (heatSensitivity && context.weather === "hot" ? 0.16 : 0);
    const eta = Math.round((product.deliveryMinutes ?? product.vendor.fulfillmentPromiseMinutes) + riskScore * 38);
    const localityComplexityScore = clamp(apartmentComplexity + ruralPenalty + festivalPenalty + trafficPenalty);

    return {
      productId: product.id,
      etaMinutes: eta,
      deliveryRisk: riskLevel(riskScore),
      routingComplexity: round(riskScore, 3),
      etaConfidence: round(clamp(0.9 - riskScore * 0.42), 3),
      spoilageTransitRisk: round(clamp((heatSensitivity ? 0.22 : 0.04) + riskScore * 0.38 + climateStress(context, perishable.class) * 0.26), 3),
      localityComplexityScore: round(localityComplexityScore, 3),
      deliveryFailureProbability: round(clamp(riskScore * 0.32 + (context.weather === "storm" ? 0.18 : 0)), 3),
      heatSensitivity,
      batchingAllowed: !heatSensitivity && riskScore < 0.55,
      reason: `${context.traffic ?? "normal"} traffic, ${context.weather ?? "normal"} weather, ${context.locality} routing, ${perishable.class} handling.`,
    };
  });
}

export function buildBasketAffinities(products: Product[], context: OperationsContext): BasketAffinityInsight[] {
  const findIds = (pattern: RegExp) => products.filter((product) => pattern.test(productText(product))).map((product) => product.id);
  const anchors = [
    { pattern: /dosa|idli|batter/, mates: /chutney|sambar|onion|coconut/, type: "meal" as const, reason: "Breakfast basket: batter pairs with chutney and sambar ingredients." },
    { pattern: /tea|coffee/, mates: /biscuit|snack|puff|bajji/, type: "co_purchase" as const, reason: "Tea-time co-purchase behavior." },
    { pattern: /pooja|flower/, mates: /camphor|agarbathi|lamp|ghee/, type: "festival" as const, reason: "Pooja and festival basket." },
    { pattern: /rainy|snack|bajji/, mates: /tea|coffee|corn|biscuit/, type: "occasion" as const, reason: "Rainy evening snack basket." },
  ];

  return anchors.flatMap((anchor) =>
    products
      .filter((product) => anchor.pattern.test(productText(product)))
      .map((product) => ({
        anchorProductId: product.id,
        affinityProductIds: findIds(anchor.mates).filter((id) => id !== product.id).slice(0, 6),
        basketType: anchor.type,
        score: round(0.68 + temporalDemandBoost(product, context) + festivalBoost(product, context), 3),
        reason: anchor.reason,
        affinityEmbeddingId: `affinity:${product.id}:${anchor.type}`,
      }))
      .filter((item) => item.affinityProductIds.length > 0),
  );
}

export function buildGeoCommerceProfile(products: Product[], inventory: OperationalInventoryRecord[], context: OperationsContext): GeoCommerceProfile {
  const locality = `${context.locality} ${context.city}`.toLowerCase();
  const archetype: GeoCommerceProfile["archetype"] = /it|tech|corridor|whitefield|velachery|indiranagar/.test(locality)
    ? "it_corridor"
    : /hostel|college|student/.test(locality)
      ? "hostel_zone"
      : /temple|mylapore|srirangam|madurai/.test(locality)
        ? "temple_town"
        : /coastal|kochi|mangalore|tuticorin|fish/.test(locality)
          ? "coastal"
          : /village|rural/.test(locality)
            ? "rural_market"
            : /adyar|anna nagar|koramangala/.test(locality)
              ? "high_income"
              : "mixed";
  const demandHeat = clamp(inventory.reduce((sum, item) => sum + item.locality_demand_score, 0) / Math.max(1, inventory.length));
  const available = inventory.reduce((sum, item) => sum + Math.max(0, item.current_stock - item.reserved_stock), 0);
  const velocity = inventory.reduce((sum, item) => sum + item.inventory_velocity, 0);
  const supplyPressure = clamp(velocity / Math.max(1, available));
  const sellerCount = new Set(products.map((product) => product.vendor.id)).size;
  const averageFreshnessRisk = clamp(inventory.reduce((sum, item) => sum + item.spoilage_risk, 0) / Math.max(1, inventory.length));
  const shortageProbability = clamp(supplyPressure * 0.68 + demandHeat * 0.22 - clamp(available / 120) * 0.18);
  const imbalance = clamp(Math.abs(demandHeat - clamp(available / Math.max(1, velocity * 12))));
  const basePoint = {
    locality: context.locality,
    city: context.city,
    latitude: products[0]?.vendor.latitude,
    longitude: products[0]?.vendor.longitude,
  };

  return {
    locality: context.locality,
    city: context.city,
    archetype,
    demandHeat: round(demandHeat, 3),
    competitionDensity: round(clamp(sellerCount / 12), 3),
    supplyPressure: round(supplyPressure, 3),
    localityPressureScore: round(clamp(demandHeat * 0.42 + supplyPressure * 0.46 + averageFreshnessRisk * 0.12), 3),
    supplyImbalanceScore: round(imbalance, 3),
    shortageProbability: round(shortageProbability, 3),
    redistributionSuggestion: shortageProbability > 0.6 ? "Boost nearby locality inventory and reserve fast-moving stock for this demand window." : imbalance > 0.45 ? "Throttle surplus visibility and trigger cross-locality discovery." : "No redistribution required.",
    demandHeatmap: [{ ...basePoint, intensity: round(demandHeat, 3), metric: "demand" }],
    sellerSaturationMap: [{ ...basePoint, intensity: round(clamp(sellerCount / 10), 3), metric: "seller_saturation" }],
    deliveryCongestionMap: [{ ...basePoint, intensity: round(context.traffic === "heavy" ? 0.82 : context.traffic === "normal" ? 0.44 : 0.18, 3), metric: "delivery_congestion" }],
    inventoryScarcityMap: [{ ...basePoint, intensity: round(shortageProbability, 3), metric: "inventory_scarcity" }],
    freshnessRiskMap: [{ ...basePoint, intensity: round(averageFreshnessRisk, 3), metric: "freshness_risk" }],
    recommendedAction: supplyPressure > 0.45 ? "Move stock or boost nearby sellers with healthier inventory." : "Maintain discovery balance and monitor demand windows.",
    localityVectorId: `locality:${context.city}:${context.locality}:operations`,
  };
}

export function buildOperationalRisks(
  inventory: OperationalInventoryRecord[],
  forecasts: DemandForecastOutput[],
  perishability: PerishabilityDecision[],
  sellers: SellerOperationsProfile[],
  pricing: DynamicPricingDecision[],
  delivery: DeliveryIntelligenceDecision[],
): OperationalRiskSignal[] {
  const risks: OperationalRiskSignal[] = [];
  for (const item of inventory.filter((entry) => entry.current_stock < entry.reserved_stock || entry.current_stock <= entry.reorder_threshold)) {
    risks.push({
      id: `inventory-${item.product_id}`,
      domain: item.current_stock < item.reserved_stock ? "inventory" : "stockout",
      level: item.current_stock < item.reserved_stock ? "critical" : riskLevel(1 - item.current_stock / Math.max(1, item.reorder_threshold * 2)),
      title: item.current_stock < item.reserved_stock ? "Inventory mismatch detected" : "Stockout risk building",
      evidence: [`${item.current_stock} current`, `${item.reserved_stock} reserved`, `threshold ${item.reorder_threshold}`],
      recoverySuggestion: "Reconcile stock, pause excess visibility, and replenish before the next local demand window.",
    });
  }
  for (const item of perishability.filter((entry) => entry.spoilageRisk > 0.58)) {
    risks.push({
      id: `spoilage-${item.productId}`,
      domain: "spoilage",
      level: item.deliveryUrgency,
      title: "Spoilage risk requires action",
      evidence: [`freshness ${item.freshnessScore}`, `spoilage ${item.spoilageRisk}`, `${item.markdownPercent}% markdown`],
      recoverySuggestion: item.distressSaleRecommended ? "Trigger distress markdown, local boost, and faster delivery routing." : "Prioritize dispatch and monitor batch age.",
    });
  }
  for (const seller of sellers.filter((entry) => entry.riskLevel === "high" || entry.riskLevel === "critical")) {
    risks.push({
      id: `seller-${seller.sellerId}`,
      domain: "seller",
      level: seller.riskLevel,
      title: "Seller operational reliability risk",
      evidence: [`health ${seller.sellerHealthScore}`, `stock accuracy ${seller.stockAccuracy}`, `freshness ${seller.freshnessQuality}`],
      recoverySuggestion: seller.recoverySuggestions[0] ?? "Review seller operating profile.",
    });
  }
  for (const item of pricing.filter((entry) => entry.manipulationRisk !== "low")) {
    risks.push({
      id: `pricing-${item.productId}`,
      domain: "pricing",
      level: item.manipulationRisk,
      title: "Pricing volatility guardrail triggered",
      evidence: [`delta ${item.priceDeltaPercent}%`, `volatility ${item.volatilityScore}`],
      recoverySuggestion: "Require seller confirmation and compare against locality benchmark before applying price changes.",
    });
  }
  for (const item of delivery.filter((entry) => entry.deliveryRisk === "high" || entry.deliveryRisk === "critical")) {
    risks.push({
      id: `delivery-${item.productId}`,
      domain: "delivery",
      level: item.deliveryRisk,
      title: "Delivery delay risk is elevated",
      evidence: [`ETA ${item.etaMinutes} min`, `complexity ${item.routingComplexity}`],
      recoverySuggestion: "Use closer seller routing, reduce batching, or widen promise window.",
    });
  }
  for (const forecast of forecasts.filter((entry) => entry.demandSpike && (entry.stockRisk === "high" || entry.stockRisk === "critical"))) {
    risks.push({
      id: `saturation-${forecast.productId}`,
      domain: "saturation",
      level: forecast.stockRisk,
      title: "Demand surge may saturate local supply",
      evidence: [`hourly ${forecast.predictedHourlySales}`, `daily ${forecast.predictedDailySales}`, forecast.surgeAlert ?? "surge"],
      recoverySuggestion: "Rebalance discovery to nearby sellers and send preparation alerts.",
    });
  }
  return risks.slice(0, 12);
}

export function buildDistressRecommendations(
  products: Product[],
  inventory: OperationalInventoryRecord[],
  pricing: DynamicPricingDecision[],
  forecasts: DemandForecastOutput[],
  context: OperationsContext,
): DistressPricingRecommendation[] {
  const invByProduct = new Map(inventory.map((item) => [item.product_id, item]));
  const pricingByProduct = new Map(pricing.map((item) => [item.productId, item]));
  const forecastByProduct = new Map(forecasts.map((item) => [item.productId, item]));
  return products.map((product) => {
    const inv = invByProduct.get(product.id);
    const price = pricingByProduct.get(product.id);
    const forecast = forecastByProduct.get(product.id);
    const wasteRisk = clamp((inv?.spoilage_risk ?? 0) * 0.52 + (1 - (inv?.freshness_score ?? 0.8)) * 0.26 + (inv?.current_stock ?? product.stockCount) / 120 * 0.12 + (forecast?.surgeProbability ? (1 - forecast.surgeProbability) * 0.1 : 0));
    const markdown = Math.max(price?.markdownRecommendation ?? 0, wasteRisk > 0.8 ? 38 : wasteRisk > 0.65 ? 26 : wasteRisk > 0.48 ? 14 : 0);
    const demandMatch = clamp((forecast?.localityDemandProjection ?? 0) / Math.max(1, (inv?.current_stock ?? product.stockCount) * 4));
    return {
      productId: product.id,
      wasteRiskScore: round(wasteRisk, 3),
      markdownSuggestion: markdown,
      clearanceUrgency: riskLevel(wasteRisk),
      distressCampaignRecommendation:
        markdown > 0
          ? `Run ${markdown}% flash freshness campaign in ${context.locality} with fast-delivery ranking boost.`
          : null,
      localityDemandMatchScore: round(demandMatch, 3),
    };
  });
}

export function buildTelemetry(products: Product[], context: OperationsContext, events: RealtimeTelemetryEvent[] = []) {
  const now = (context.now ?? new Date()).toISOString();
  const generated: RealtimeTelemetryEvent[] = products.slice(0, 8).flatMap((product, index) => [
    {
      id: `telemetry-inventory-${product.id}`,
      createdAt: now,
      eventType: "inventory_change",
      locality: context.locality,
      city: context.city,
      productId: product.id,
      sellerId: product.vendor.id,
      value: product.stockCount,
      metadata: { source: "operations_snapshot", sequence: index },
      sequence: index,
      region: context.region ?? "south-india",
      idempotencyKey: `inventory_change:${context.city}:${context.locality}:${product.id}:${now}`,
    },
  ]);
  const seen = new Set<string>();
  const all = [...events, ...generated].filter((event) => {
    const key = event.idempotencyKey ?? event.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const purchases = all.filter((event) => event.eventType === "purchase").length;
  const inventoryChanges = all.filter((event) => event.eventType === "inventory_change" || event.eventType === "stock_change").length;
  const spoilageEvents = all.filter((event) => event.eventType === "spoilage_event").length;
  const counters = all.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
    return acc;
  }, {});
  const partitionKey = `${context.region ?? "south-india"}:${context.city}:${context.locality}`;
  return {
    events: all,
    metrics: {
      eventCount: all.length,
      purchases,
      inventoryChanges,
      spoilageEvents,
      sellerActivity: all.filter((event) => event.eventType === "seller_activity").length,
      pricingChanges: all.filter((event) => event.eventType === "pricing_change").length,
    },
    streamKey: `ops:${context.city}:${context.locality}:${timeWindow(context)}`,
    aggregation: {
      partitionKey,
      dedupedEventCount: events.length + generated.length - all.length,
      replaySafe: true,
      idempotencyKeys: all.map((event) => event.idempotencyKey ?? event.id),
      counters,
      region: context.region ?? "south-india",
    },
  };
}

export function buildOperationalAlerts(risks: OperationalRiskSignal[], context: OperationsContext): OperationalAlertEvent[] {
  const now = (context.now ?? new Date()).toISOString();
  return risks.map((risk) => {
    const escalationTarget = risk.level === "critical" ? "ops" : risk.domain === "seller" ? "seller" : risk.domain === "pricing" ? "admin" : "automation";
    const suppressionKey = `${risk.domain}:${risk.id}:${context.city}:${context.locality}`;
    return {
      id: `alert-${risk.id}`,
      domain: risk.domain,
      severity: risk.level,
      state: risk.level === "low" ? "suppressed" : risk.level === "critical" ? "escalated" : "open",
      title: risk.title,
      escalationTarget,
      suppressionKey,
      replayKey: `${suppressionKey}:${timeWindow(context)}`,
      evidence: risk.evidence,
      createdAt: now,
    };
  });
}

export function buildOperationalDashboard(
  inventory: OperationalInventoryRecord[],
  freshness: FreshnessDecayProfile[],
  geoCommerce: GeoCommerceProfile,
  delivery: DeliveryIntelligenceDecision[],
  sellers: SellerOperationsProfile[],
  distress: DistressPricingRecommendation[],
  forecasts: DemandForecastOutput[],
  context: OperationsContext,
) {
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const inventoryHealth = average(inventory.map((item) => item.inventory_health_score ?? 60));
  const freshnessMonitoring = average(freshness.map((item) => item.freshnessScore * 100));
  const deliveryRisk = average(delivery.map((item) => item.deliveryFailureProbability * 100));
  const sellerHealth = average(sellers.map((seller) => seller.sellerHealthScore));
  const distressInventory = distress.filter((item) => item.markdownSuggestion > 0).length;
  const demandForecasts = average(forecasts.map((forecast) => forecast.confidence * 100));
  const festivalSurgeMonitoring = context.festival && context.festival !== "none" ? average(forecasts.map((forecast) => forecast.surgeProbability * 100)) : 0;
  const panel = (key: string, label: string, value: number, inverse = false) => ({
    key,
    label,
    value: round(value, 1),
    severity: riskLevel(inverse ? value / 100 : 1 - value / 100),
  });
  return {
    inventoryHealth: round(inventoryHealth, 1),
    freshnessMonitoring: round(freshnessMonitoring, 1),
    localityPressure: round(geoCommerce.localityPressureScore * 100, 1),
    deliveryRisk: round(deliveryRisk, 1),
    sellerHealth: round(sellerHealth, 1),
    distressInventory,
    demandForecasts: round(demandForecasts, 1),
    festivalSurgeMonitoring: round(festivalSurgeMonitoring, 1),
    panels: [
      panel("inventory", "Inventory Health", inventoryHealth),
      panel("freshness", "Freshness Monitoring", freshnessMonitoring),
      panel("locality", "Locality Pressure", geoCommerce.localityPressureScore * 100, true),
      panel("delivery", "Delivery Risk", deliveryRisk, true),
      panel("seller", "Seller Health", sellerHealth),
      panel("distress", "Distress Inventory", Math.min(100, distressInventory * 20), true),
      panel("forecast", "Demand Forecasts", demandForecasts),
      panel("festival", "Festival Surge", festivalSurgeMonitoring, true),
    ],
  };
}

export function buildOperationalAsyncJobs(context: OperationsContext, telemetryAggregation: { partitionKey: string }): OperationalAsyncJob[] {
  const partitionKey = telemetryAggregation.partitionKey;
  const basePayload = { city: context.city, locality: context.locality, window: timeWindow(context), region: context.region ?? "south-india" };
  return [
    ["tier3.inventory.scan", "commerce-critical", "high"],
    ["tier3.demand.forecast", "analytics-bulk", "normal"],
    ["tier3.distress.pricing", "commerce-critical", "high"],
    ["tier3.locality.rebalance", "realtime-sync", "normal"],
    ["tier3.freshness.scan", "logistics-coordination", "high"],
    ["tier3.telemetry.aggregate", "realtime-sync", "normal"],
  ].map(([jobName, queueName, priority]) => ({
    jobName,
    queueName,
    partitionKey,
    idempotencyKey: `${jobName}:${partitionKey}:${basePayload.window}`,
    priority,
    payload: basePayload,
  })) as OperationalAsyncJob[];
}

export function buildHyperlocalOperationsSnapshot(input: BuildOperationsInput): HyperlocalOperationsSnapshot {
  const sellers = input.sellers ?? [...new Map(input.products.map((product) => [product.vendor.id, product.vendor])).values()];
  const inventory = buildOperationalInventory(input.products, input.context, input.inventory);
  const forecasts = buildDemandForecasts(input.products, inventory, input.context);
  const freshness = buildFreshnessProfiles(input.products, inventory, input.context);
  const pricing = buildDynamicPricing(input.products, inventory, forecasts, input.context);
  const perishability = buildPerishabilityOperations(input.products, inventory, input.context);
  const sellerProfiles = buildSellerOperationsProfiles(sellers, input.products, inventory);
  const delivery = buildDeliveryIntelligence(input.products, input.context);
  const baskets = buildBasketAffinities(input.products, input.context);
  const geoCommerce = buildGeoCommerceProfile(input.products, inventory, input.context);
  const distress = buildDistressRecommendations(input.products, inventory, pricing, forecasts, input.context);
  const risks = buildOperationalRisks(inventory, forecasts, perishability, sellerProfiles, pricing, delivery);
  const alerts = buildOperationalAlerts(risks, input.context);
  const telemetry = buildTelemetry(input.products, input.context, input.telemetry);
  const dashboard = buildOperationalDashboard(inventory, freshness, geoCommerce, delivery, sellerProfiles, distress, forecasts, input.context);
  const asyncJobs = buildOperationalAsyncJobs(input.context, telemetry.aggregation);

  return {
    generatedAt: (input.context.now ?? new Date()).toISOString(),
    context: input.context,
    inventory,
    pricing,
    forecasts,
    freshness,
    perishability,
    sellers: sellerProfiles,
    delivery,
    baskets,
    geoCommerce,
    distress,
    risks,
    alerts,
    dashboard,
    asyncJobs,
    telemetry,
    aiReadiness: {
      entityEmbeddings: input.products.map((product) => `entity:${product.id}:operations`),
      behavioralVectors: input.products.map((product) => `behavior:${product.id}:demand`),
      temporalVectors: input.products.map((product) => `temporal:${product.id}:${timeWindow(input.context)}`),
      localityVectors: [geoCommerce.localityVectorId],
      demandEmbeddings: forecasts.map((forecast) => `demand:${forecast.locality}:${forecast.productId}`),
      sellerEmbeddings: sellerProfiles.map((seller) => seller.sellerEmbeddingId),
      productAffinityEmbeddings: baskets.map((basket) => basket.affinityEmbeddingId),
      freshnessVectors: freshness.map((profile) => `freshness:${profile.productId}:${profile.perishabilityClass}`),
      operationalEmbeddings: inventory.map((item) => `operations:${item.seller_id}:${item.product_id}:${item.inventory_state}`),
    },
  };
}
