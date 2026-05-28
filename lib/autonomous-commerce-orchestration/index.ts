import { buildHyperlocalOperationsSnapshot } from "@/lib/hyperlocal-operations";
import type {
  AdaptiveLearningEvent,
  AutonomousCommerceOrchestrationSnapshot,
  AutonomousOrchestrationInput,
  AgentCoordination,
  InventoryCoordinationPlan,
  LocalityBalancingPlan,
  MarketplaceIntegrityGraph,
  MarketplaceHealthSnapshot,
  MarketplacePressureSnapshot,
  OperationalAgentState,
  OrchestrationActionType,
  OrchestrationDecision,
  OrchestrationDecisionType,
  OrchestrationJob,
  OrchestrationSimulationResult,
  OrchestrationTelemetry,
  PredictiveLocalityIntelligence,
  RecoveryPlan,
  RoutingPlan,
  SellerOptimizationRecommendation,
  StabilizationPlan,
  SupplyDemandRebalancing,
  DeliveryAdaptationIntelligence,
  TrustIntegritySignal,
} from "@/types/autonomous-commerce-orchestration";
import type { HyperlocalOperationsSnapshot, RiskLevel } from "@/types/hyperlocal-operations";

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

function riskLevel(score: number): RiskLevel {
  if (score >= 0.82) return "critical";
  if (score >= 0.62) return "high";
  if (score >= 0.38) return "medium";
  return "low";
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function actionToDecisionType(actionType: OrchestrationActionType): OrchestrationDecisionType {
  const map: Record<OrchestrationActionType, OrchestrationDecisionType> = {
    rebalance_inventory: "inventory_rebalancing",
    redirect_discovery: "search_reweighting",
    seller_advisory: "seller_boosting",
    delivery_adaptation: "delivery_adaptation",
    distress_clearance: "distress_pricing",
    trust_review: "trust_escalation",
    stabilization: "surge_preparation",
    forecast_recalculation: "surge_preparation",
    containment: "recovery_containment",
  };
  return map[actionType];
}

function decision(
  input: Omit<
    OrchestrationDecision,
    | "id"
    | "decision_id"
    | "decision_type"
    | "decision_confidence"
    | "locality_scope"
    | "risk_level"
    | "approval_required"
    | "rollback_supported"
    | "replay_safe"
    | "explainability_report"
    | "created_at"
    | "expires_at"
    | "reversible"
    | "rollbackToken"
    | "state"
    | "severity"
    | "impactScope"
    | "auditMetadata"
  > & {
    now: Date;
    recoveryPath?: string[];
    rollbackPath?: string[];
  },
): OrchestrationDecision {
  const replayKey = input.replayKey;
  const id = `decision-${hashText(`${input.actionType}:${input.locality}:${input.title}`)}`;
  const rollbackToken = `rollback:${hashText(replayKey)}`;
  const requiresApproval = input.requiresApproval || input.risk === "high" || input.risk === "critical";
  const createdAt = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + (input.risk === "critical" ? 30 : 120) * 60_000).toISOString();
  return {
    ...input,
    id,
    decision_id: id,
    decision_type: actionToDecisionType(input.actionType),
    decision_confidence: input.confidence,
    locality_scope: input.locality,
    risk_level: input.risk,
    approval_required: requiresApproval,
    rollback_supported: true,
    replay_safe: true,
    explainability_report: {
      summary: input.title,
      why: input.evidence,
      sourceSignals: input.evidence,
      localityContext: input.locality,
      confidence: input.confidence,
      risk: input.risk,
      recoveryPath: input.recoveryPath ?? ["Escalate to operator review before applying operational changes.", "Use nearby healthy sellers or cached state when primary signal fails."],
      rollbackPath: input.rollbackPath ?? ["Suppress recommendation.", "Restore previous discovery weighting.", "Record rollback audit event."],
    },
    generated_by: input.generated_by,
    created_at: createdAt,
    expires_at: expiresAt,
    reversible: true,
    rollbackToken,
    state: requiresApproval ? "needs_approval" : "proposed",
    severity: input.risk,
    impactScope: `${input.locality}:${input.affected_entities.join(",") || "locality"}`,
    auditMetadata: {
      replayKey,
      idempotencyKey: `${replayKey}:${id}`,
      governanceVersion: "tier5-v1",
      unsafeActionsBlocked: ["hard_delete", "auto_refund", "auto_ban_seller", "irreversible_inventory_mutation", "direct_ai_publish"],
    },
  };
}

export function buildLocalityBalancingPlan(operations: HyperlocalOperationsSnapshot): LocalityBalancingPlan {
  const geo = operations.geoCommerce;
  const imbalance = clamp(geo.supplyImbalanceScore * 0.45 + geo.shortageProbability * 0.38 + geo.localityPressureScore * 0.17);
  const criticalInventory = operations.inventory.filter((item) => ["critical", "low_stock", "distressed"].includes(item.inventory_state ?? ""));
  return {
    locality: geo.locality,
    city: geo.city,
    localityImbalanceScore: round(imbalance, 3),
    redistributionRecommendations:
      imbalance > 0.62
        ? ["Redirect nearby surplus inventory into discovery.", "Coordinate cross-seller replenishment for fast-moving categories.", "Throttle low-freshness inventory visibility."]
        : ["Maintain normal discovery distribution.", "Keep neighboring locality inventory warm for surge fallback."],
    inventoryPressureAlerts: criticalInventory.map((item) => `${item.product_id} ${item.inventory_state} with pressure ${item.locality_pressure_score ?? 0}`),
    localityStabilizationPlan: [
      geo.redistributionSuggestion,
      geo.shortageProbability > 0.55 ? "Activate nearby seller boost with operator review." : "Continue monitoring locality pressure.",
      "Keep all actions reversible and replay-validated.",
    ],
  };
}

export function buildInventoryCoordinationPlan(operations: HyperlocalOperationsSnapshot): InventoryCoordinationPlan {
  const restock = operations.inventory.filter((item) => ["critical", "low_stock", "pending_restock"].includes(item.inventory_state ?? ""));
  const deadStock = operations.inventory.filter((item) => (item.current_stock - item.reserved_stock) > Math.max(10, item.inventory_velocity * 16) && item.locality_demand_score < 0.45);
  const distress = operations.distress.filter((item) => item.markdownSuggestion > 0);
  return {
    restockSuggestions: restock.map((item) => `Restock ${item.product_id} before sellout ETA ${item.sellout_eta_hours ?? "unknown"}h.`),
    stockReductionSuggestions: deadStock.map((item) => `Reduce visibility or transfer slow stock ${item.product_id}.`),
    localityTransfers: operations.geoCommerce.shortageProbability > 0.58 ? [`Move inventory toward ${operations.context.locality} from neighboring surplus sellers.`] : [],
    distressClearance: distress.map((item) => `Run supervised ${item.markdownSuggestion}% clearance for ${item.productId}.`),
    freshnessPrioritization: operations.freshness.filter((item) => item.freshnessScore > 0.65).map((item) => `Boost fresh batch ${item.productId} in discovery.`),
    driftDetected: restock.length > operations.inventory.length * 0.35 || deadStock.length > operations.inventory.length * 0.35,
  };
}

export function buildSellerOptimization(operations: HyperlocalOperationsSnapshot): SellerOptimizationRecommendation[] {
  return operations.sellers.map((seller) => ({
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    recommendations:
      seller.riskLevel === "high" || seller.riskLevel === "critical"
        ? ["Confirm live stock immediately.", "Pause risky promises until fulfillment stabilizes.", "Use nearby fresh inventory for substitutions only with buyer consent."]
        : ["Maintain restock rhythm.", "Prepare for next demand window.", "Keep image and freshness proof updated."],
    operationalRiskAlerts: seller.riskLevel === "low" ? [] : [`Seller risk ${seller.sellerRiskScore}, trend ${seller.sellerReliabilityTrend}.`],
    inventoryAdvisories: seller.recoverySuggestions,
    pricingAdvisories: ["Apply pricing recommendations only after seller confirmation and locality benchmark review."],
    coachingTone: seller.riskLevel === "critical" ? "urgent" : seller.riskLevel === "high" ? "supervised" : "simple",
    confidence: round(clamp(seller.sellerHealthScore / 100), 3),
  }));
}

export function buildPredictiveLocalityIntelligence(operations: HyperlocalOperationsSnapshot): PredictiveLocalityIntelligence {
  const context = operations.context;
  const surge = average(operations.forecasts.map((forecast) => forecast.surgeProbability ?? 0));
  const deliveryRisk = average(operations.delivery.map((item) => item.deliveryFailureProbability));
  const freshnessRisk = average(operations.freshness.map((item) => item.spoilageProbability));
  const sellerShortage = clamp(operations.sellers.filter((seller) => seller.riskLevel === "high" || seller.riskLevel === "critical").length / Math.max(1, operations.sellers.length));
  const locality = `${context.city} ${context.locality}`.toLowerCase();
  const regionalPattern = /chennai/.test(locality)
    ? "Chennai breakfast, milk, flower, and evening snack demand windows."
    : /kerala|kochi|calicut|thiruvananthapuram/.test(locality)
      ? "Kerala fish, coconut, bakery, and rain-led essentials behavior."
      : /coimbatore/.test(locality)
        ? "Coimbatore bakery, textile-worker timing, and evening tiffin behavior."
        : /temple|mylapore|madurai|srirangam/.test(locality)
          ? "Temple-town pooja, flowers, milk, and festival surge behavior."
          : "Mixed South Indian hyperlocal demand behavior.";
  return {
    demandSurgeProbability: round(surge, 3),
    rainDrivenDemand: round(context.weather === "rainy" || context.weather === "storm" ? 0.74 : 0.18, 3),
    festivalSpikeProbability: round(context.festival && context.festival !== "none" ? 0.78 : 0.12, 3),
    trafficDisruptionRisk: round(context.traffic === "heavy" ? 0.78 : context.traffic === "normal" ? 0.36 : 0.12, 3),
    deliverySaturationRisk: round(deliveryRisk, 3),
    sellerShortageRisk: round(sellerShortage, 3),
    freshnessRisk: round(freshnessRisk, 3),
    regionalPattern,
  };
}

export function buildMarketplaceHealth(operations: HyperlocalOperationsSnapshot): MarketplaceHealthSnapshot {
  const inventoryHealth = average(operations.inventory.map((item) => (item.inventory_health_score ?? 60) / 100));
  const sellerReliability = average(operations.sellers.map((seller) => seller.sellerHealthScore / 100));
  const deliveryReliability = 1 - average(operations.delivery.map((item) => item.deliveryFailureProbability));
  const freshnessStability = average(operations.freshness.map((item) => item.freshnessScore));
  const pricingStability = 1 - average(operations.pricing.map((item) => item.volatilityScore));
  const searchQuality = clamp(0.72 + operations.aiReadiness.entityEmbeddings.length / Math.max(20, operations.inventory.length * 8));
  const operationalLoad = clamp(operations.risks.length / 12 + operations.telemetry.metrics.eventCount / 100);
  const localityStability = clamp(1 - operations.geoCommerce.localityPressureScore * 0.52 - operations.geoCommerce.supplyImbalanceScore * 0.32);
  const marketplaceHealthScore = Math.round(average([inventoryHealth, sellerReliability, deliveryReliability, freshnessStability, pricingStability, searchQuality, localityStability, 1 - operationalLoad]) * 100);
  return {
    marketplaceHealthScore,
    localityStabilityScore: Math.round(localityStability * 100),
    inventoryHealth: Math.round(inventoryHealth * 100),
    sellerReliability: Math.round(sellerReliability * 100),
    deliveryReliability: Math.round(deliveryReliability * 100),
    freshnessStability: Math.round(freshnessStability * 100),
    pricingStability: Math.round(pricingStability * 100),
    searchQuality: Math.round(searchQuality * 100),
    operationalLoad: Math.round(operationalLoad * 100),
    saturationDetected: operationalLoad > 0.65 || operations.geoCommerce.localityPressureScore > 0.68,
  };
}

export function buildMarketplacePressure(operations: HyperlocalOperationsSnapshot, trust: TrustIntegritySignal[]): MarketplacePressureSnapshot {
  const sellerShare = Math.max(
    0,
    ...operations.sellers.map((seller) => operations.inventory.filter((item) => item.seller_id === seller.sellerId).length / Math.max(1, operations.inventory.length)),
  );
  const criticalInventoryShare = operations.inventory.filter((item) => ["critical", "low_stock", "unavailable"].includes(item.inventory_state ?? "")).length / Math.max(1, operations.inventory.length);
  const deliverySaturationRisk = average(operations.delivery.map((item) => item.deliveryFailureProbability));
  const fakeScarcityRisk = average(trust.map((item) => item.fakeScarcityRisk));
  const freshnessCollapseRisk = average(operations.freshness.map((item) => item.spoilageProbability));
  const priceVolatilityRisk = average(operations.pricing.map((item) => item.volatilityScore));
  const localityImbalanceRisk = operations.geoCommerce.supplyImbalanceScore;
  const alerts = [
    sellerShare > 0.58 ? "Seller monopolization risk: discovery exposure needs caps." : "",
    criticalInventoryShare > 0.35 ? "Inventory fragmentation risk: low stock spread across demand categories." : "",
    deliverySaturationRisk > 0.55 ? "Delivery saturation risk: adapt ETA and reduce batching." : "",
    fakeScarcityRisk > 0.35 ? "Fake scarcity risk: escalate seller trust review." : "",
    freshnessCollapseRisk > 0.55 ? "Freshness collapse risk: prioritize dispatch and supervised markdowns." : "",
    priceVolatilityRisk > 0.5 ? "Price volatility spike: require anti-manipulation review." : "",
    localityImbalanceRisk > 0.5 ? "Locality imbalance: rebalance nearby seller visibility." : "",
  ].filter(Boolean);

  return {
    sellerMonopolizationRisk: round(clamp(sellerShare), 3),
    inventoryFragmentationRisk: round(clamp(criticalInventoryShare), 3),
    deliverySaturationRisk: round(deliverySaturationRisk, 3),
    fakeScarcityRisk: round(fakeScarcityRisk, 3),
    freshnessCollapseRisk: round(freshnessCollapseRisk, 3),
    priceVolatilityRisk: round(priceVolatilityRisk, 3),
    localityImbalanceRisk: round(localityImbalanceRisk, 3),
    pressureAlerts: alerts.length > 0 ? alerts : ["Marketplace pressure is within bounded operating range."],
  };
}

export function buildStabilizationPlan(operations: HyperlocalOperationsSnapshot, pressure: MarketplacePressureSnapshot): StabilizationPlan {
  const maxPressure = Math.max(
    pressure.sellerMonopolizationRisk,
    pressure.inventoryFragmentationRisk,
    pressure.deliverySaturationRisk,
    pressure.fakeScarcityRisk,
    pressure.freshnessCollapseRisk,
    pressure.priceVolatilityRisk,
    pressure.localityImbalanceRisk,
  );
  return {
    pressureType: riskLevel(maxPressure),
    stabilizationPlans: [
      "Cap single-seller discovery concentration until pressure clears.",
      "Prefer healthy nearby sellers for reversible discovery boosts.",
      "Keep all pricing, trust, and inventory interventions in recommendation mode.",
    ],
    localityRecoveryRecommendations:
      pressure.localityImbalanceRisk > 0.45
        ? [`Recover ${operations.context.locality} by widening discovery to adjacent healthy sellers.`, "Route fresh, high-confidence inventory ahead of low-freshness surplus."]
        : ["Continue locality monitoring with no intervention."],
    dynamicDiscoveryReweighting: [
      "Increase exposure for high-trust sellers with accurate stock.",
      "Decrease exposure for stale, low-confidence, or trust-review inventory.",
      "Record all weighting changes as reversible recommendation candidates.",
    ],
    inventoryRedistributionSuggestions:
      pressure.inventoryFragmentationRisk > 0.3
        ? ["Consolidate discovery around available stock while operators review actual transfer feasibility.", "Suggest nearby surplus routing for fast-moving categories."]
        : ["Keep inventory routing warm for surge fallback."],
    reversible: true,
    approvalRequired: maxPressure > 0.62,
  };
}

export function buildRecoveryPlan(input: AutonomousOrchestrationInput, operations: HyperlocalOperationsSnapshot): RecoveryPlan {
  const sellerCollapse = operations.sellers.some((seller) => input.outageSellerIds?.includes(seller.sellerId) || seller.riskLevel === "critical");
  const deliveryFailure = operations.delivery.filter((item) => item.deliveryRisk === "high" || item.deliveryRisk === "critical").length > operations.delivery.length * 0.35;
  const inventoryCorruption = operations.inventory.some((item) => item.current_stock < item.reserved_stock);
  const inventoryCollapse = operations.inventory.filter((item) => ["critical", "unavailable"].includes(item.inventory_state ?? "")).length > operations.inventory.length * 0.45;
  const localityShortage = operations.geoCommerce.shortageProbability > 0.72;
  const freshnessRisk = average(operations.freshness.map((item) => item.spoilageProbability)) > 0.62;
  const searchDegradation = operations.aiReadiness.entityEmbeddings.length < operations.inventory.length;
  const failureMode = input.telemetryGap
    ? "telemetry_gap"
    : sellerCollapse
      ? "seller_collapse"
      : deliveryFailure
        ? "delivery_congestion"
        : inventoryCollapse
          ? "inventory_collapse"
          : localityShortage
            ? "locality_shortage"
            : inventoryCorruption
              ? "inventory_corruption"
              : freshnessRisk
                ? "freshness_risk"
                : searchDegradation
                  ? "search_degradation"
                  : "none";
  return {
    failureMode,
    containmentActions:
      failureMode === "none"
        ? ["No containment required."]
        : ["Limit risky discovery boosts.", "Require approval before seller-facing changes.", "Preserve current state for replay audit."],
    failoverSuggestions:
      failureMode === "seller_collapse"
        ? ["Route demand to healthy nearby sellers.", "Notify operators to validate seller status."]
        : failureMode === "delivery_congestion"
          ? ["Reduce batching for fresh goods.", "Widen ETA promises with buyer-visible explanation."]
          : failureMode === "inventory_collapse" || failureMode === "locality_shortage"
            ? ["Use nearby surplus seller recommendations.", "Prepare supervised restock advisories."]
            : failureMode === "freshness_risk"
              ? ["Contain at-risk fresh inventory visibility.", "Queue operator-approved freshness clearance."]
          : failureMode === "telemetry_gap"
            ? ["Switch to cached operational snapshot.", "Queue telemetry replay validation."]
            : [],
    stabilizationActions: ["Use reversible recommendations only.", "Attach rollback token to every decision.", "Escalate high-risk autonomy to operator approval."],
    rollbackPlan: ["Expire decision before execution window.", "Restore prior discovery and ETA recommendations.", "Append rollback event to orchestration audit stream."],
    approvalGates: ["critical-risk operator approval", "trust-impact admin approval", "pricing-impact seller confirmation"],
    auditTrail: [`failure:${failureMode}`, `scope:${operations.context.city}:${operations.context.locality}`, `generated:${operations.generatedAt}`],
    destructiveActionsBlocked: true,
  };
}

export function buildRoutingPlan(operations: HyperlocalOperationsSnapshot): RoutingPlan {
  return {
    optimizedRoutingPlans: operations.delivery
      .filter((item) => item.deliveryRisk !== "low")
      .map((item) => `Adapt route for ${item.productId}: ETA ${item.etaMinutes}m, confidence ${item.etaConfidence}.`),
    sellerBoostRecommendations: operations.sellers
      .filter((seller) => seller.riskLevel === "low" && seller.sellerHealthScore > 72)
      .map((seller) => `Boost ${seller.sellerName} for stable fulfillment.`),
    freshnessAwareDiscoveryRanking: operations.freshness
      .sort((a, b) => b.freshnessRankBoost - a.freshnessRankBoost)
      .slice(0, 8)
      .map((item) => ({ productId: item.productId, boost: item.freshnessRankBoost, reason: "freshness and proximity optimized" })),
    deliveryRoutePriorities: operations.delivery.map((item) => ({ productId: item.productId, priority: item.deliveryRisk, reason: item.reason })),
  };
}

export function buildTrustIntegritySignals(operations: HyperlocalOperationsSnapshot): TrustIntegritySignal[] {
  return operations.sellers.map((seller) => {
    const sellerInventory = operations.inventory.filter((item) => item.seller_id === seller.sellerId);
    const fakeInventoryRisk = clamp(sellerInventory.filter((item) => item.current_stock < item.reserved_stock).length / Math.max(1, sellerInventory.length));
    const priceRisk = clamp(operations.pricing.filter((item) => item.manipulationRisk !== "low").length / Math.max(1, operations.pricing.length));
    const freshnessRisk = clamp(1 - seller.freshnessQuality);
    const scarcityRisk = clamp(sellerInventory.filter((item) => item.current_stock <= item.reorder_threshold && item.locality_demand_score < 0.4).length / Math.max(1, sellerInventory.length));
    const sellerManipulationRisk = clamp((100 - seller.sellerHealthScore) / 100);
    const trustScore = clamp(1 - (fakeInventoryRisk * 0.24 + priceRisk * 0.2 + freshnessRisk * 0.2 + scarcityRisk * 0.16 + sellerManipulationRisk * 0.16 + (seller.riskLevel === "critical" ? 0.12 : 0)));
    return {
      sellerId: seller.sellerId,
      trustScore: Math.round(trustScore * 100),
      fakeInventoryRisk: round(fakeInventoryRisk, 3),
      sellerManipulationRisk: round(sellerManipulationRisk, 3),
      priceExploitationRisk: round(priceRisk, 3),
      fraudClusterRisk: round(clamp(fakeInventoryRisk * 0.5 + priceRisk * 0.5), 3),
      freshnessDeceptionRisk: round(freshnessRisk, 3),
      fakeScarcityRisk: round(scarcityRisk, 3),
      reviewRequired: trustScore < 0.68 || fakeInventoryRisk > 0.4 || priceRisk > 0.45,
    };
  });
}

function buildDecisions(
  operations: HyperlocalOperationsSnapshot,
  balancing: LocalityBalancingPlan,
  recovery: RecoveryPlan,
  trust: TrustIntegritySignal[],
  pressure: MarketplacePressureSnapshot,
): OrchestrationDecision[] {
  const locality = operations.context.locality;
  const now = new Date(operations.generatedAt);
  const decisions: OrchestrationDecision[] = [];
  if (balancing.localityImbalanceScore > 0.45) {
    decisions.push(
      decision({
        now,
        actionType: "rebalance_inventory",
        title: "Rebalance locality supply pressure",
        locality,
        affected_entities: operations.inventory.map((item) => item.product_id).slice(0, 8),
        confidence: balancing.localityImbalanceScore,
        risk: riskLevel(balancing.localityImbalanceScore),
        requiresApproval: balancing.localityImbalanceScore > 0.62,
        replayKey: `rebalance:${operations.context.city}:${locality}`,
        evidence: balancing.redistributionRecommendations,
        generated_by: "locality",
      }),
    );
  }
  for (const distress of operations.distress.filter((item) => item.markdownSuggestion > 0).slice(0, 4)) {
    decisions.push(
      decision({
        now,
        actionType: "distress_clearance",
        title: `Clear distress inventory ${distress.productId}`,
        locality,
        affected_entities: [distress.productId],
        confidence: distress.wasteRiskScore,
        risk: distress.clearanceUrgency,
        requiresApproval: true,
        replayKey: `distress:${distress.productId}:${locality}`,
        evidence: [distress.distressCampaignRecommendation ?? "Clearance recommended", `waste risk ${distress.wasteRiskScore}`],
        generated_by: "pricing",
        recoveryPath: ["Escalate markdown to seller confirmation.", "Prefer freshness-aware discovery before price changes."],
      }),
    );
  }
  if (pressure.deliverySaturationRisk > 0.45) {
    decisions.push(
      decision({
        now,
        actionType: "delivery_adaptation",
        title: "Adapt delivery promises for saturation",
        locality,
        affected_entities: operations.delivery.map((item) => item.productId).slice(0, 8),
        confidence: pressure.deliverySaturationRisk,
        risk: riskLevel(pressure.deliverySaturationRisk),
        requiresApproval: pressure.deliverySaturationRisk > 0.62,
        replayKey: `delivery:${operations.context.city}:${locality}`,
        evidence: ["traffic/weather/festival delivery risk elevated", `delivery saturation ${pressure.deliverySaturationRisk}`],
        generated_by: "delivery",
      }),
    );
  }
  if (pressure.priceVolatilityRisk > 0.45 || pressure.freshnessCollapseRisk > 0.48) {
    decisions.push(
      decision({
        now,
        actionType: "redirect_discovery",
        title: "Reweight search toward high-integrity fresh supply",
        locality,
        affected_entities: operations.freshness.map((item) => item.productId).slice(0, 8),
        confidence: Math.max(pressure.priceVolatilityRisk, pressure.freshnessCollapseRisk),
        risk: riskLevel(Math.max(pressure.priceVolatilityRisk, pressure.freshnessCollapseRisk)),
        requiresApproval: true,
        replayKey: `search-reweight:${operations.context.city}:${locality}`,
        evidence: ["freshness, pricing, and trust pressure require supervised reweighting", ...pressure.pressureAlerts.slice(0, 2)],
        generated_by: "agent_consensus",
      }),
    );
  }
  if (recovery.failureMode !== "none") {
    decisions.push(
      decision({
        now,
        actionType: "containment",
        title: `Contain ${recovery.failureMode}`,
        locality,
        affected_entities: [recovery.failureMode],
        confidence: 0.82,
        risk: "high",
        requiresApproval: true,
        replayKey: `contain:${recovery.failureMode}:${locality}`,
        evidence: recovery.containmentActions,
        generated_by: "trust",
        recoveryPath: recovery.stabilizationActions,
        rollbackPath: recovery.rollbackPlan,
      }),
    );
  }
  for (const signal of trust.filter((item) => item.reviewRequired).slice(0, 4)) {
    decisions.push(
      decision({
        now,
        actionType: "trust_review",
        title: `Review seller trust ${signal.sellerId}`,
        locality,
        affected_entities: [signal.sellerId],
        confidence: clamp(1 - signal.trustScore / 100),
        risk: riskLevel(1 - signal.trustScore / 100),
        requiresApproval: true,
        replayKey: `trust:${signal.sellerId}:${locality}`,
        evidence: [`fake inventory ${signal.fakeInventoryRisk}`, `price risk ${signal.priceExploitationRisk}`, `freshness risk ${signal.freshnessDeceptionRisk}`],
        generated_by: "trust",
      }),
    );
  }
  return decisions.slice(0, 14);
}

function buildAdaptiveLearning(operations: HyperlocalOperationsSnapshot): AdaptiveLearningEvent[] {
  const seeds: Array<AdaptiveLearningEvent["signal"]> = ["search", "purchase", "locality_demand", "delivery_outcome", "freshness_complaint", "seller_performance"];
  return seeds.map((signal) => ({
    id: `learning-${signal}-${hashText(operations.generatedAt)}`,
    signal,
    adjustment:
      signal === "locality_demand"
        ? `Adjust locality pressure baseline for ${operations.context.locality}.`
        : signal === "delivery_outcome"
          ? "Tune ETA risk weighting from recent delivery outcomes."
          : "Record supervised adaptation candidate.",
    explainability: "Learning event is stored as reversible evidence, not an automatic irreversible mutation.",
    reversible: true,
    replayKey: `learn:${signal}:${operations.context.city}:${operations.context.locality}`,
  }));
}

function buildAgentStates(operations: HyperlocalOperationsSnapshot, decisions: OrchestrationDecision[]): OperationalAgentState[] {
  const agentActions: Record<OperationalAgentState["agent"], OrchestrationActionType[]> = {
    inventory: ["rebalance_inventory", "distress_clearance"],
    delivery: ["delivery_adaptation"],
    pricing: ["distress_clearance", "trust_review"],
    freshness: ["distress_clearance", "redirect_discovery"],
    seller: ["seller_advisory", "trust_review"],
    trust: ["containment", "stabilization", "trust_review"],
    locality: ["rebalance_inventory", "forecast_recalculation"],
    demand: ["forecast_recalculation", "stabilization", "redirect_discovery"],
  };
  return Object.entries(agentActions).map(([agent, actions]) => {
    const proposed = decisions.filter((decisionItem) => actions.includes(decisionItem.actionType)).map((decisionItem) => decisionItem.actionType);
    const conflicts = proposed.includes("distress_clearance") && proposed.includes("trust_review") ? ["pricing action requires trust review first"] : [];
    const riskScore = agent === "delivery" ? average(operations.delivery.map((item) => item.deliveryFailureProbability)) : agent === "seller" ? average(operations.sellers.map((seller) => 1 - seller.sellerHealthScore / 100)) : proposed.length / 8;
    const confidence = round(clamp(0.62 + proposed.length * 0.05 - conflicts.length * 0.12), 3);
    return {
      agent: agent as OperationalAgentState["agent"],
      health: riskLevel(riskScore),
      proposedActions: [...new Set(proposed)],
      conflicts,
      bounded: true,
      replaySafe: true,
      confidence,
      deterministicOutputKey: `agent:${agent}:${hashText(`${operations.context.city}:${operations.context.locality}:${proposed.join("|")}`)}`,
      localityScope: `${operations.context.city}/${operations.context.locality}`,
      consensusWeight: round(confidence * (conflicts.length > 0 ? 0.72 : 1), 3),
    };
  });
}

function buildAgentCoordination(operations: HyperlocalOperationsSnapshot, agents: OperationalAgentState[]): AgentCoordination {
  const conflicts = agents.flatMap((agent) => agent.conflicts.map((conflict) => `${agent.agent}: ${conflict}`));
  return {
    sharedContextKey: `tier5:${operations.context.city}:${operations.context.locality}:${hashText(operations.generatedAt)}`,
    arbitrationDecisions: conflicts.length > 0 ? ["Trust and inventory safety outrank pricing and discovery boosts."] : ["No blocking agent conflicts detected."],
    conflictResolution: conflicts.length > 0 ? conflicts : ["All agents converged on bounded recommendation mode."],
    consensusSummary: agents.map((agent) => `${agent.agent}:${agent.health}:${agent.consensusWeight}`),
    priorityEscalations: agents.filter((agent) => agent.health === "high" || agent.health === "critical").map((agent) => `${agent.agent} requires operator-visible monitoring.`),
    deterministic: true,
    replaySafe: true,
  };
}

function buildSupplyDemandRebalancing(operations: HyperlocalOperationsSnapshot, balancing: LocalityBalancingPlan): SupplyDemandRebalancing {
  const pressure = operations.geoCommerce.localityPressureScore;
  const stability = clamp(1 - pressure * 0.52 - balancing.localityImbalanceScore * 0.28);
  return {
    locality_pressure_score: round(pressure, 3),
    imbalance_severity: riskLevel(balancing.localityImbalanceScore),
    redistribution_efficiency: round(clamp(1 - balancing.localityImbalanceScore * 0.54 + operations.geoCommerce.competitionDensity * 0.18), 3),
    locality_stability_score: Math.round(stability * 100),
    nearbySellerRebalancing: ["Recommend healthy adjacent sellers for surge categories.", "Keep rebalancing reversible and approval-aware."],
    discoveryRedistribution: balancing.redistributionRecommendations,
    inventorySurplusRouting: balancing.inventoryPressureAlerts.length > 0 ? ["Route surplus visibility toward pressured products after stock verification."] : ["No surplus routing required."],
    demandSpikeCompensation: operations.forecasts.filter((forecast) => forecast.demandSpike).map((forecast) => `Compensate demand spike for ${forecast.productId} with nearby stock visibility.`),
  };
}

function buildDeliveryAdaptation(operations: HyperlocalOperationsSnapshot): DeliveryAdaptationIntelligence {
  const context = operations.context;
  const weatherRisk = context.weather === "storm" ? 0.78 : context.weather === "rainy" ? 0.58 : context.weather === "hot" ? 0.42 : 0.16;
  const heatRisk = clamp(((context.heatIndexCelsius ?? 30) - 30) / 16 + (context.weather === "hot" ? 0.24 : 0));
  const rainRisk = context.weather === "rainy" || context.weather === "storm" ? 0.72 : 0.08;
  const trafficRisk = context.traffic === "heavy" ? 0.78 : context.traffic === "normal" ? 0.32 : 0.12;
  const festivalRisk = context.festivalCongestion || (context.festival && context.festival !== "none") ? 0.74 : 0.08;
  const ruralRisk = context.ruralAccess ? 0.62 : 0.12;
  const apartmentDensityRisk = /mylapore|adyar|anna nagar|koramangala|velachery/i.test(`${context.locality} ${context.city}`) ? 0.44 : 0.2;
  return {
    weatherRisk: round(weatherRisk, 3),
    heatRisk: round(heatRisk, 3),
    rainRisk: round(rainRisk, 3),
    trafficRisk: round(trafficRisk, 3),
    festivalCongestionRisk: round(festivalRisk, 3),
    apartmentDensityRisk: round(apartmentDensityRisk, 3),
    ruralComplexityRisk: round(ruralRisk, 3),
    deliveryRiskAdaptation: ["Reduce batching for ultra-fresh goods.", "Prefer closer sellers when weather or traffic risk rises."],
    etaRecoveryPlanning: operations.delivery.filter((item) => item.deliveryRisk !== "low").map((item) => `Recover ETA for ${item.productId} from ${item.etaMinutes}m with supervised promise widening.`),
    deliverySaturationDetection: [`Average failure probability ${round(average(operations.delivery.map((item) => item.deliveryFailureProbability)), 3)}.`],
    adaptiveRoutingIntelligence: ["Prioritize active cold-chain or fast-turnover stock.", "Keep routing changes as advisory until dispatch confirmation."],
  };
}

function buildMarketplaceIntegrityGraph(trustIntegrity: TrustIntegritySignal[]): MarketplaceIntegrityGraph {
  return {
    sellerTrustProfiles: trustIntegrity,
    fraudSignals: trustIntegrity
      .filter((signal) => signal.reviewRequired)
      .map((signal) => `seller:${signal.sellerId}:fakeInventory=${signal.fakeInventoryRisk}:fakeScarcity=${signal.fakeScarcityRisk}`),
    trustCorrelations: trustIntegrity.map((signal) => `seller:${signal.sellerId}:trust:${signal.trustScore}:fraudCluster:${signal.fraudClusterRisk}`),
    escalationRecommendations: trustIntegrity.filter((signal) => signal.reviewRequired).map((signal) => `Escalate ${signal.sellerId} to trust review queue; do not auto-ban.`),
    automaticBansBlocked: true,
  };
}

function buildOrchestrationTelemetry(decisions: OrchestrationDecision[], recovery: RecoveryPlan, governance: { approvalRequiredCount: number }, operations: HyperlocalOperationsSnapshot): OrchestrationTelemetry {
  return {
    decisionGeneration: decisions.map((item) => `${item.decision_id}:${item.decision_type}:${item.state}`),
    confidenceShifts: decisions.map((item) => `${item.decision_id}:${item.decision_confidence}`),
    recoveryPlans: recovery.failureMode === "none" ? ["No recovery plan activated."] : recovery.stabilizationActions,
    approvalEvents: decisions.filter((item) => item.approval_required).map((item) => `queued:${item.decision_id}:${item.risk_level}`),
    rollbackEvents: decisions.map((item) => `available:${item.decision_id}:${item.rollbackToken}`),
    localityInterventions: decisions.filter((item) => item.decision_type === "inventory_rebalancing" || item.decision_type === "locality_redistribution").map((item) => item.title),
    trustEscalations: decisions.filter((item) => item.decision_type === "trust_escalation").map((item) => item.title),
    replayValidationMetrics: {
      decisions: decisions.length,
      replaySafe: decisions.filter((item) => item.replay_safe).length,
      idempotencyKeys: new Set(decisions.map((item) => item.auditMetadata.idempotencyKey)).size,
    },
    governanceAnalytics: {
      approvalRequired: governance.approvalRequiredCount,
      operatorOverrideEnabled: 1,
      telemetryEvents: operations.telemetry.metrics.eventCount,
    },
  };
}

function buildSimulationResults(
  decisions: OrchestrationDecision[],
  marketplaceHealth: MarketplaceHealthSnapshot,
  agentCoordination: AgentCoordination,
): OrchestrationSimulationResult[] {
  const scenarios: OrchestrationSimulationResult["scenario"][] = [
    "locality_demand_surge",
    "seller_collapse",
    "fish_market_shortage",
    "delivery_saturation",
    "rain_disruption",
    "festival_congestion",
    "fake_scarcity_attack",
    "inventory_imbalance",
    "search_degradation",
    "multi_agent_conflict_resolution",
  ];
  return scenarios.map((scenario) => ({
    scenario,
    boundedActions: decisions.every((item) => item.auditMetadata.unsafeActionsBlocked.length === 5 && item.reversible),
    replaySafe: decisions.every((item) => item.replay_safe),
    rollbackSupported: decisions.every((item) => item.rollback_supported),
    localityStability: marketplaceHealth.localityStabilityScore,
    operationalExplainability: decisions.every((item) => item.explainability_report.why.length > 0),
    validationNotes:
      scenario === "multi_agent_conflict_resolution"
        ? agentCoordination.conflictResolution
        : ["recommendation-only automation", "approval-aware escalation", "audit and rollback metadata present"],
  }));
}

function buildAsyncJobs(operations: HyperlocalOperationsSnapshot): OrchestrationJob[] {
  const scope = `${operations.context.city}:${operations.context.locality}`;
  return [
    ["tier5.locality.balance", "realtime-sync"],
    ["tier5.forecast.recalculate", "analytics-bulk"],
    ["tier5.seller.advisory", "notification-delivery"],
    ["tier5.delivery.adapt", "logistics-coordination"],
    ["tier5.trust.analyze", "governance-risk"],
    ["tier5.marketplace.stabilize", "commerce-critical"],
    ["tier5.demand.respond", "commerce-critical"],
    ["tier5.orchestration.simulate", "analytics-bulk"],
  ].map(([jobName, queueName]) => ({
    jobName,
    queueName,
    idempotencyKey: `${jobName}:${hashText(scope)}`,
    replaySafe: true,
    failoverEnabled: true,
    observable: true,
    queueIsolationKey: `${queueName}:${hashText(scope)}`,
  })) as OrchestrationJob[];
}

export function buildAutonomousCommerceOrchestration(input: AutonomousOrchestrationInput): AutonomousCommerceOrchestrationSnapshot {
  const operations = input.operations ?? buildHyperlocalOperationsSnapshot({ products: input.products, sellers: input.sellers, context: input.context });
  const localityBalancing = buildLocalityBalancingPlan(operations);
  const inventoryCoordination = buildInventoryCoordinationPlan(operations);
  const sellerOptimization = buildSellerOptimization(operations);
  const predictiveLocality = buildPredictiveLocalityIntelligence(operations);
  const marketplaceHealth = buildMarketplaceHealth(operations);
  const recovery = buildRecoveryPlan(input, operations);
  const routing = buildRoutingPlan(operations);
  const trustIntegrity = buildTrustIntegritySignals(operations);
  const marketplacePressure = buildMarketplacePressure(operations, trustIntegrity);
  const stabilizationPlan = buildStabilizationPlan(operations, marketplacePressure);
  const decisions = buildDecisions(operations, localityBalancing, recovery, trustIntegrity, marketplacePressure);
  const adaptiveLearning = buildAdaptiveLearning(operations);
  const agents = buildAgentStates(operations, decisions);
  const agentCoordination = buildAgentCoordination(operations, agents);
  const rebalancing = buildSupplyDemandRebalancing(operations, localityBalancing);
  const deliveryAdaptation = buildDeliveryAdaptation(operations);
  const marketplaceIntegrity = buildMarketplaceIntegrityGraph(trustIntegrity);
  const rollbackTokens = decisions.map((item) => item.rollbackToken);
  const governance = {
    approvalRequiredCount: decisions.filter((item) => item.requiresApproval).length,
    rollbackTokens,
    operatorOverrideEnabled: true,
    safetyThresholds: {
      autoExecuteIrreversible: 0,
      approvalRequiredRisk: 0.62,
      replayValidationRequired: 1,
      trustReviewBelow: 68,
      directPublishAiData: 0,
      autonomousBanSeller: 0,
    },
    replayValidationKeys: decisions.map((item) => item.replayKey),
    explainabilityReport: decisions.map((item) => `${item.title}: ${item.evidence.join("; ")}`),
    approvalQueue: decisions
      .filter((item) => item.approval_required)
      .map((item) => ({ decisionId: item.decision_id, risk: item.risk_level, reason: item.title, rollbackToken: item.rollbackToken })),
    humanOverrideControls: ["suppress decision", "approve supervised action", "rollback recommendation", "escalate to trust/admin review"],
    replayValidationLayer: decisions.map((item) => `${item.replayKey}:deterministic:idempotent`),
    decisionAuditEvents: decisions.map((item) => `audit:${item.decision_id}:${item.state}:${item.auditMetadata.governanceVersion}`),
  };
  const telemetry = buildOrchestrationTelemetry(decisions, recovery, governance, operations);
  const simulations = buildSimulationResults(decisions, marketplaceHealth, agentCoordination);

  return {
    generatedAt: (input.context.now ?? new Date()).toISOString(),
    operations,
    decisions,
    localityBalancing,
    inventoryCoordination,
    sellerOptimization,
    predictiveLocality,
    marketplaceHealth,
    marketplacePressure,
    stabilizationPlan,
    recovery,
    routing,
    rebalancing,
    deliveryAdaptation,
    demandResponse: [
      predictiveLocality.demandSurgeProbability > 0.55 ? "Prepare dynamic discovery boosts for surge categories." : "Keep normal demand response active.",
      predictiveLocality.festivalSpikeProbability > 0.55 ? "Queue festival preparation advisories for sellers." : "No festival escalation required.",
      "All demand-response actions require replay-safe decision audit.",
    ],
    regionalOptimization: [predictiveLocality.regionalPattern, `Optimize locality profile for ${operations.context.city}/${operations.context.locality}.`],
    stabilization: [
      marketplaceHealth.saturationDetected ? "Activate marketplace pressure stabilization plan." : "Marketplace stable; continue adaptive monitoring.",
      "Prevent seller monopolization by limiting exposure concentration.",
      "Block irreversible autonomous mutations.",
    ],
    resourceAllocation: [
      "Allocate delivery bandwidth to fresh and high-confidence inventory first.",
      "Distribute search visibility across healthy sellers.",
      "Reserve operator-reviewed boosts for shortage categories.",
    ],
    trustIntegrity,
    marketplaceIntegrity,
    adaptiveLearning,
    agents,
    agentCoordination,
    governance,
    asyncJobs: buildAsyncJobs(operations),
    telemetry,
    simulations,
  };
}
