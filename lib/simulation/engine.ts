// KARTEX M3 — Simulation engine.
// Browser-safe, fully deterministic (seeded) simulation models that build on the
// Tier 10 mathematics (Bass diffusion, Lanchester competition, stochastic
// projection) but remove the Node-only `crypto` dependency so simulations can
// run on the client for instant, reproducible results.

import type {
  ConstraintCheck,
  ModelKey,
  ResultKpi,
  RiskAnalysis,
  RiskLevel,
  SimulationConstraint,
  SimulationResult,
  Tone,
} from "./types";

// ──────────────────────────────────────────────────────────────────────────
// Deterministic randomness
// ──────────────────────────────────────────────────────────────────────────

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number, mean: number, std: number) {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

export function deterministicSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ──────────────────────────────────────────────────────────────────────────
// Formatters (INR, the VendorHub operating currency)
// ──────────────────────────────────────────────────────────────────────────

export function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatCurrency(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${round(value, digits)}%`;
}

// ──────────────────────────────────────────────────────────────────────────
// Parameter access helpers
// ──────────────────────────────────────────────────────────────────────────

type Params = Record<string, number | string>;

function num(params: Params, key: string, fallback = 0): number {
  const v = params[key];
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? (n as number) : fallback;
}

function str(params: Params, key: string, fallback = ""): string {
  const v = params[key];
  return v == null ? fallback : String(v);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ──────────────────────────────────────────────────────────────────────────
// Shared result assembly helpers
// ──────────────────────────────────────────────────────────────────────────

function kpi(key: string, label: string, value: number, display: string, tone: Tone = "neutral", unit?: string): ResultKpi {
  return { key, label, value: round(value, 4), display, tone, unit };
}

function riskFromScore(score: number, factors: RiskAnalysis["factors"]): RiskAnalysis {
  const level: RiskLevel = score >= 66 ? "high" : score >= 33 ? "medium" : "low";
  return { level, score: round(score, 0), factors };
}

function checkConstraints(constraints: SimulationConstraint[], kpis: ResultKpi[]): ConstraintCheck[] {
  return constraints.map((c) => {
    const target = kpis.find((k) => k.key === c.metric);
    const actual = target ? target.value : 0;
    const satisfied =
      c.operator === "lte" ? actual <= c.threshold : c.operator === "gte" ? actual >= c.threshold : Math.abs(actual - c.threshold) < 1e-6;
    return { constraintId: c.id, label: c.label, metric: c.metric, operator: c.operator, threshold: c.threshold, actual: round(actual, 2), satisfied };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Model: market adoption (Bass diffusion)
// ──────────────────────────────────────────────────────────────────────────

function runMarketAdoption(params: Params): Omit<SimulationResult, "constraintChecks"> {
  const marketSize = Math.max(1, num(params, "marketSize", 100000));
  const p = clamp(num(params, "innovation", 3) / 100, 0.0001, 0.5);
  const q = clamp(num(params, "imitation", 38) / 100, 0.0001, 0.95);
  const periods = clamp(Math.round(num(params, "periods", 24)), 2, 120);
  const price = Math.max(0, num(params, "pricePerUnit", 499));

  let cumulative = 0;
  const newAdoptersSeries: { x: number; y: number }[] = [];
  const cumulativeSeries: { x: number; y: number }[] = [];
  const revenueSeries: { x: number; y: number }[] = [];
  const rows: string[][] = [];
  let peakPeriod = 0;
  let peakNew = 0;
  let timeTo50 = 0;

  for (let t = 1; t <= periods; t += 1) {
    const remaining = marketSize - cumulative;
    const newAdopters = Math.max(0, (p + (q * cumulative) / marketSize) * remaining);
    cumulative = Math.min(marketSize, cumulative + newAdopters);
    if (newAdopters > peakNew) {
      peakNew = newAdopters;
      peakPeriod = t;
    }
    if (!timeTo50 && cumulative >= marketSize * 0.5) timeTo50 = t;
    newAdoptersSeries.push({ x: t, y: round(newAdopters, 0) });
    cumulativeSeries.push({ x: t, y: round(cumulative, 0) });
    revenueSeries.push({ x: t, y: round(newAdopters * price, 0) });
    rows.push([`P${t}`, formatNumber(newAdopters), formatNumber(cumulative), formatPercent((cumulative / marketSize) * 100), formatCurrency(newAdopters * price)]);
  }

  const penetration = (cumulative / marketSize) * 100;
  const totalRevenue = cumulative * price;

  const kpis: ResultKpi[] = [
    kpi("total_adopters", "Total adopters", cumulative, formatNumber(cumulative), "success"),
    kpi("penetration", "Market penetration", penetration, formatPercent(penetration), penetration >= 60 ? "success" : penetration >= 30 ? "info" : "warning"),
    kpi("peak_period", "Peak adoption period", peakPeriod, `P${peakPeriod}`, "info"),
    kpi("time_to_50", "Time to 50% penetration", timeTo50, timeTo50 ? `P${timeTo50}` : "Not reached", timeTo50 ? "info" : "warning"),
    kpi("estimated_revenue", "Estimated revenue", totalRevenue, formatCurrency(totalRevenue), "success"),
  ];

  const riskScore = clamp((timeTo50 ? (timeTo50 / periods) * 60 : 80) + (penetration < 40 ? 20 : 0), 0, 100);

  return {
    headlineKpiKey: "total_adopters",
    kpis,
    series: [
      { key: "new", label: "New adopters / period", color: "brand", points: newAdoptersSeries },
      { key: "cumulative", label: "Cumulative adopters", color: "ai", points: cumulativeSeries },
    ],
    table: { columns: ["Period", "New", "Cumulative", "Penetration", "Revenue"], rows },
    sensitivity: [
      { parameterKey: "imitation", parameterLabel: "Word-of-mouth (q)", lowValue: q * 0.7 * 100, highValue: q * 1.3 * 100, outcomeDelta: round(q * 42, 1) },
      { parameterKey: "innovation", parameterLabel: "Innovation (p)", lowValue: p * 0.7 * 100, highValue: p * 1.3 * 100, outcomeDelta: round(p * 120, 1) },
      { parameterKey: "marketSize", parameterLabel: "Market size", lowValue: marketSize * 0.8, highValue: marketSize * 1.2, outcomeDelta: 20 },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Adoption timing", impact: timeTo50 && timeTo50 <= periods / 2 ? "low" : "medium", detail: timeTo50 ? `50% penetration reached at P${timeTo50}.` : "50% penetration not reached in horizon." },
      { label: "Ceiling penetration", impact: penetration >= 60 ? "low" : penetration >= 30 ? "medium" : "high", detail: `Projected ceiling penetration ${formatPercent(penetration)}.` },
    ]),
    outcomeSummary: `The market reaches ${formatNumber(cumulative)} adopters (${formatPercent(penetration)} of ${formatNumber(marketSize)}) over ${periods} periods, peaking at P${peakPeriod}.`,
    trendSummary: peakPeriod <= periods / 3 ? "Front-loaded adoption: early surge then saturation." : "Gradual S-curve adoption driven by word-of-mouth.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Model: demand forecast (trend + seasonality + bounded noise)
// ──────────────────────────────────────────────────────────────────────────

function runDemandForecast(params: Params, seed: number): Omit<SimulationResult, "constraintChecks"> {
  const base = Math.max(0, num(params, "baseDemand", 1200));
  const growth = num(params, "growthRate", 4) / 100;
  const seasonality = num(params, "seasonality", 15) / 100;
  const periods = clamp(Math.round(num(params, "periods", 18)), 2, 120);
  const volatility = num(params, "volatility", 8) / 100;
  const rng = mulberry32(seed);

  const meanSeries: { x: number; y: number }[] = [];
  const upper: { x: number; y: number }[] = [];
  const lower: { x: number; y: number }[] = [];
  const rows: string[][] = [];
  let total = 0;
  let peak = 0;

  for (let t = 1; t <= periods; t += 1) {
    const trend = base * (1 + growth) ** (t - 1);
    const seasonal = 1 + seasonality * Math.sin((2 * Math.PI * t) / 6);
    const noise = gaussian(rng, 0, volatility);
    const value = Math.max(0, trend * seasonal * (1 + noise));
    const band = trend * seasonal * volatility * 1.64; // ~90% band
    total += value;
    peak = Math.max(peak, value);
    meanSeries.push({ x: t, y: round(value, 0) });
    upper.push({ x: t, y: round(value + band, 0) });
    lower.push({ x: t, y: round(Math.max(0, value - band), 0) });
    rows.push([`P${t}`, formatNumber(value), formatNumber(Math.max(0, value - band)), formatNumber(value + band)]);
  }

  const avg = total / periods;
  const horizon = meanSeries[meanSeries.length - 1].y;
  const totalGrowth = ((horizon - meanSeries[0].y) / Math.max(1, meanSeries[0].y)) * 100;

  const kpis: ResultKpi[] = [
    kpi("total_demand", "Total forecast demand", total, formatNumber(total), "success"),
    kpi("avg_demand", "Average / period", avg, formatNumber(avg), "info"),
    kpi("peak_demand", "Peak demand", peak, formatNumber(peak), "info"),
    kpi("horizon_demand", "Demand at horizon", horizon, formatNumber(horizon), "success"),
    kpi("growth", "Net growth", totalGrowth, formatPercent(totalGrowth), totalGrowth >= 0 ? "success" : "danger"),
  ];

  const riskScore = clamp(volatility * 220 + (growth < 0 ? 30 : 0), 0, 100);

  return {
    headlineKpiKey: "total_demand",
    kpis,
    series: [
      { key: "upper", label: "Upper band (P90)", color: "neutral", points: upper },
      { key: "forecast", label: "Forecast demand", color: "brand", points: meanSeries },
      { key: "lower", label: "Lower band (P10)", color: "neutral", points: lower },
    ],
    table: { columns: ["Period", "Forecast", "Lower", "Upper"], rows },
    sensitivity: [
      { parameterKey: "growthRate", parameterLabel: "Growth rate", lowValue: (growth - 0.02) * 100, highValue: (growth + 0.02) * 100, outcomeDelta: round(Math.abs(growth) * 100 + 18, 1) },
      { parameterKey: "seasonality", parameterLabel: "Seasonality", lowValue: (seasonality - 0.05) * 100, highValue: (seasonality + 0.05) * 100, outcomeDelta: round(seasonality * 60, 1) },
      { parameterKey: "volatility", parameterLabel: "Volatility", lowValue: (volatility - 0.03) * 100, highValue: (volatility + 0.03) * 100, outcomeDelta: round(volatility * 80, 1) },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Demand volatility", impact: volatility >= 0.15 ? "high" : volatility >= 0.08 ? "medium" : "low", detail: `Period volatility ±${formatPercent(volatility * 100)}.` },
      { label: "Growth direction", impact: growth >= 0 ? "low" : "high", detail: growth >= 0 ? "Positive growth trajectory." : "Contracting demand trajectory." },
    ]),
    outcomeSummary: `Forecast totals ${formatNumber(total)} units over ${periods} periods, averaging ${formatNumber(avg)} with a ${formatPercent(totalGrowth)} net change to horizon.`,
    trendSummary: growth >= 0.03 ? "Strong upward trend with seasonal cycles." : growth >= 0 ? "Steady demand with seasonal cycles." : "Declining trend; mitigation recommended.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Model: revenue projection (Monte Carlo)
// ──────────────────────────────────────────────────────────────────────────

function runRevenueProjection(params: Params, seed: number): Omit<SimulationResult, "constraintChecks"> {
  const baseUnits = Math.max(0, num(params, "units", 800));
  const price = Math.max(0, num(params, "price", 650));
  const growth = num(params, "growthRate", 6) / 100;
  const churn = num(params, "churnRate", 4) / 100;
  const cost = Math.max(0, num(params, "costPerUnit", 280));
  const fixed = Math.max(0, num(params, "fixedCost", 60000));
  const periods = clamp(Math.round(num(params, "periods", 12)), 2, 60);
  const volatility = num(params, "volatility", 12) / 100;
  const iterations = clamp(Math.round(num(params, "iterations", 300)), 50, 2000);

  const revenueByPeriod = new Array(periods).fill(0);
  const profitByPeriod = new Array(periods).fill(0);
  const totalProfits: number[] = [];
  let lossCount = 0;
  let breakevenAccum = 0;
  let breakevenPeriod = 0;

  for (let i = 0; i < iterations; i += 1) {
    const rng = mulberry32(seed + i * 2654435761);
    let units = baseUnits;
    let iterTotalProfit = 0;
    let accumProfit = 0;
    for (let t = 0; t < periods; t += 1) {
      const noise = gaussian(rng, 0, volatility);
      units = Math.max(0, units * (1 + growth - churn) * (1 + noise));
      const revenue = units * price;
      const profit = revenue - units * cost - fixed;
      revenueByPeriod[t] += revenue;
      profitByPeriod[t] += profit;
      iterTotalProfit += profit;
      accumProfit += profit;
      if (!breakevenPeriod && i === 0 && accumProfit >= 0) breakevenPeriod = t + 1;
    }
    totalProfits.push(iterTotalProfit);
    if (iterTotalProfit < 0) lossCount += 1;
    breakevenAccum += iterTotalProfit;
  }

  const meanRevenue = revenueByPeriod.map((v, t) => ({ x: t + 1, y: round(v / iterations, 0) }));
  const meanProfit = profitByPeriod.map((v, t) => ({ x: t + 1, y: round(v / iterations, 0) }));
  const sortedTotals = [...totalProfits].sort((a, b) => a - b);
  const p10 = sortedTotals[Math.floor(iterations * 0.1)];
  const p90 = sortedTotals[Math.floor(iterations * 0.9)];
  const meanTotalProfit = breakevenAccum / iterations;
  const totalRevenue = meanRevenue.reduce((s, p) => s + p.y, 0);
  const margin = totalRevenue > 0 ? (meanTotalProfit / totalRevenue) * 100 : 0;
  const lossProbability = (lossCount / iterations) * 100;

  const rows = meanRevenue.map((r, t) => [`P${t + 1}`, formatCurrency(r.y), formatCurrency(meanProfit[t].y)]);

  const kpis: ResultKpi[] = [
    kpi("total_revenue", "Total revenue (mean)", totalRevenue, formatCurrency(totalRevenue), "success"),
    kpi("total_profit", "Total profit (mean)", meanTotalProfit, formatCurrency(meanTotalProfit), meanTotalProfit >= 0 ? "success" : "danger"),
    kpi("margin", "Profit margin", margin, formatPercent(margin), margin >= 15 ? "success" : margin >= 0 ? "warning" : "danger"),
    kpi("p10_profit", "Downside profit (P10)", p10, formatCurrency(p10), p10 >= 0 ? "info" : "danger"),
    kpi("p90_profit", "Upside profit (P90)", p90, formatCurrency(p90), "info"),
    kpi("loss_probability", "Probability of loss", lossProbability, formatPercent(lossProbability), lossProbability <= 10 ? "success" : lossProbability <= 30 ? "warning" : "danger"),
    kpi("breakeven", "Breakeven period", breakevenPeriod, breakevenPeriod ? `P${breakevenPeriod}` : "Not reached", breakevenPeriod ? "info" : "warning"),
  ];

  const riskScore = clamp(lossProbability * 0.8 + (margin < 0 ? 30 : margin < 10 ? 15 : 0), 0, 100);

  return {
    headlineKpiKey: "total_profit",
    kpis,
    series: [
      { key: "revenue", label: "Revenue / period (mean)", color: "ai", points: meanRevenue },
      { key: "profit", label: "Profit / period (mean)", color: "brand", points: meanProfit },
    ],
    table: { columns: ["Period", "Revenue", "Profit"], rows },
    distribution: sortedTotals.map((v) => round(v, 0)),
    sensitivity: [
      { parameterKey: "price", parameterLabel: "Unit price", lowValue: price * 0.9, highValue: price * 1.1, outcomeDelta: round((price / Math.max(1, price - cost)) * 22, 1) },
      { parameterKey: "churnRate", parameterLabel: "Churn rate", lowValue: (churn - 0.02) * 100, highValue: (churn + 0.02) * 100, outcomeDelta: round(churn * 180, 1) },
      { parameterKey: "costPerUnit", parameterLabel: "Unit cost", lowValue: cost * 0.9, highValue: cost * 1.1, outcomeDelta: round((cost / Math.max(1, price)) * 40, 1) },
      { parameterKey: "growthRate", parameterLabel: "Growth rate", lowValue: (growth - 0.02) * 100, highValue: (growth + 0.02) * 100, outcomeDelta: round(growth * 120 + 14, 1) },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Downside exposure", impact: lossProbability <= 10 ? "low" : lossProbability <= 30 ? "medium" : "high", detail: `${formatPercent(lossProbability)} of ${iterations} runs end in loss.` },
      { label: "Margin resilience", impact: margin >= 15 ? "low" : margin >= 0 ? "medium" : "high", detail: `Mean margin ${formatPercent(margin)}.` },
    ]),
    outcomeSummary: `Across ${iterations} Monte-Carlo runs, mean total profit is ${formatCurrency(meanTotalProfit)} on ${formatCurrency(totalRevenue)} revenue (margin ${formatPercent(margin)}). Downside P10 ${formatCurrency(p10)}, upside P90 ${formatCurrency(p90)}.`,
    trendSummary: meanTotalProfit >= 0 ? "Profitable central case with quantified downside band." : "Central case is loss-making; structural change required.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Model: pricing sensitivity / optimization (elasticity sweep)
// ──────────────────────────────────────────────────────────────────────────

function runPricingSensitivity(params: Params): Omit<SimulationResult, "constraintChecks"> {
  const basePrice = Math.max(1, num(params, "basePrice", 500));
  const baseDemand = Math.max(0, num(params, "baseDemand", 1000));
  const elasticity = num(params, "elasticity", -1.4);
  const cost = Math.max(0, num(params, "costPerUnit", 220));
  const priceMin = Math.max(1, num(params, "priceMin", 300));
  const priceMax = Math.max(priceMin + 1, num(params, "priceMax", 900));
  const steps = clamp(Math.round(num(params, "steps", 24)), 4, 120);

  const profitSeries: { x: number; y: number }[] = [];
  const revenueSeries: { x: number; y: number }[] = [];
  const demandSeries: { x: number; y: number }[] = [];
  const rows: string[][] = [];
  let optimalPrice = priceMin;
  let maxProfit = -Infinity;
  let revenueAtOptimal = 0;
  let demandAtOptimal = 0;
  let profitAtBase = 0;

  for (let i = 0; i <= steps; i += 1) {
    const price = priceMin + ((priceMax - priceMin) * i) / steps;
    const demand = baseDemand * (price / basePrice) ** elasticity;
    const revenue = price * demand;
    const profit = (price - cost) * demand;
    if (profit > maxProfit) {
      maxProfit = profit;
      optimalPrice = price;
      revenueAtOptimal = revenue;
      demandAtOptimal = demand;
    }
    if (Math.abs(price - basePrice) < (priceMax - priceMin) / steps / 2 + 0.5) profitAtBase = profit;
    profitSeries.push({ x: round(price, 0), y: round(profit, 0) });
    revenueSeries.push({ x: round(price, 0), y: round(revenue, 0) });
    demandSeries.push({ x: round(price, 0), y: round(demand, 0) });
    rows.push([formatCurrency(price), formatNumber(demand), formatCurrency(revenue), formatCurrency(profit)]);
  }

  const upliftVsBase = profitAtBase > 0 ? ((maxProfit - profitAtBase) / profitAtBase) * 100 : 0;

  const kpis: ResultKpi[] = [
    kpi("optimal_price", "Profit-optimal price", optimalPrice, formatCurrency(optimalPrice), "success"),
    kpi("max_profit", "Profit at optimal", maxProfit, formatCurrency(maxProfit), "success"),
    kpi("revenue_at_optimal", "Revenue at optimal", revenueAtOptimal, formatCurrency(revenueAtOptimal), "info"),
    kpi("demand_at_optimal", "Demand at optimal", demandAtOptimal, formatNumber(demandAtOptimal), "info"),
    kpi("uplift_vs_base", "Profit uplift vs base", upliftVsBase, formatPercent(upliftVsBase), upliftVsBase > 0 ? "success" : "neutral"),
  ];

  const riskScore = clamp(Math.abs(elasticity) * 28, 0, 100);

  return {
    headlineKpiKey: "max_profit",
    kpis,
    series: [
      { key: "profit", label: "Profit by price", color: "brand", points: profitSeries },
      { key: "revenue", label: "Revenue by price", color: "ai", points: revenueSeries },
    ],
    table: { columns: ["Price", "Demand", "Revenue", "Profit"], rows },
    sensitivity: [
      { parameterKey: "elasticity", parameterLabel: "Price elasticity", lowValue: elasticity - 0.3, highValue: elasticity + 0.3, outcomeDelta: round(Math.abs(elasticity) * 30, 1) },
      { parameterKey: "costPerUnit", parameterLabel: "Unit cost", lowValue: cost * 0.9, highValue: cost * 1.1, outcomeDelta: round((cost / basePrice) * 45, 1) },
      { parameterKey: "baseDemand", parameterLabel: "Base demand", lowValue: baseDemand * 0.9, highValue: baseDemand * 1.1, outcomeDelta: 10 },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Demand elasticity", impact: Math.abs(elasticity) >= 2 ? "high" : Math.abs(elasticity) >= 1 ? "medium" : "low", detail: `Elasticity ${elasticity}: ${Math.abs(elasticity) >= 1 ? "demand reacts strongly to price" : "demand is inelastic"}.` },
      { label: "Margin floor", impact: optimalPrice - cost > cost ? "low" : "medium", detail: `Optimal margin per unit ${formatCurrency(optimalPrice - cost)}.` },
    ]),
    outcomeSummary: `Profit is maximised at ${formatCurrency(optimalPrice)} yielding ${formatCurrency(maxProfit)} (${formatPercent(upliftVsBase)} above the base price of ${formatCurrency(basePrice)}).`,
    trendSummary: optimalPrice > basePrice ? "Headroom to raise price for higher profit." : "Current price is at or above the profit-optimal point.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Model: inventory simulation (reorder point + lead time)
// ──────────────────────────────────────────────────────────────────────────

function runInventorySimulation(params: Params, seed: number): Omit<SimulationResult, "constraintChecks"> {
  const initialStock = Math.max(0, num(params, "initialStock", 500));
  const dailyDemand = Math.max(0, num(params, "dailyDemand", 60));
  const volatility = num(params, "demandVolatility", 30) / 100;
  const reorderPoint = Math.max(0, num(params, "reorderPoint", 200));
  const reorderQty = Math.max(1, num(params, "reorderQty", 400));
  const leadTime = clamp(Math.round(num(params, "leadTime", 4)), 0, 60);
  const periods = clamp(Math.round(num(params, "periods", 30)), 2, 180);
  const rng = mulberry32(seed);

  let stock = initialStock;
  let pendingArrival = -1;
  let stockoutDays = 0;
  let unitsShort = 0;
  let ordersPlaced = 0;
  let stockSum = 0;
  let demandMet = 0;
  let demandTotal = 0;
  const stockSeries: { x: number; y: number }[] = [];
  const demandSeries: { x: number; y: number }[] = [];
  const rows: string[][] = [];

  for (let t = 1; t <= periods; t += 1) {
    if (pendingArrival === t) {
      stock += reorderQty;
      pendingArrival = -1;
    }
    const demand = Math.max(0, Math.round(gaussian(rng, dailyDemand, dailyDemand * volatility)));
    demandTotal += demand;
    const fulfilled = Math.min(stock, demand);
    demandMet += fulfilled;
    if (demand > stock) {
      stockoutDays += 1;
      unitsShort += demand - stock;
    }
    stock = Math.max(0, stock - demand);
    if (stock <= reorderPoint && pendingArrival === -1) {
      pendingArrival = t + leadTime;
      ordersPlaced += 1;
    }
    stockSum += stock;
    stockSeries.push({ x: t, y: stock });
    demandSeries.push({ x: t, y: demand });
    rows.push([`D${t}`, formatNumber(demand), formatNumber(stock), demand > stockSeries[stockSeries.length - 2]?.y ? "" : ""]);
  }

  const serviceLevel = demandTotal > 0 ? (demandMet / demandTotal) * 100 : 100;
  const avgStock = stockSum / periods;

  const kpis: ResultKpi[] = [
    kpi("service_level", "Service level", serviceLevel, formatPercent(serviceLevel), serviceLevel >= 98 ? "success" : serviceLevel >= 92 ? "warning" : "danger"),
    kpi("stockout_days", "Stockout days", stockoutDays, formatNumber(stockoutDays), stockoutDays === 0 ? "success" : stockoutDays <= periods * 0.1 ? "warning" : "danger"),
    kpi("units_short", "Units short", unitsShort, formatNumber(unitsShort), unitsShort === 0 ? "success" : "warning"),
    kpi("avg_stock", "Average stock", avgStock, formatNumber(avgStock), "info"),
    kpi("orders_placed", "Replenishment orders", ordersPlaced, formatNumber(ordersPlaced), "info"),
    kpi("ending_stock", "Ending stock", stock, formatNumber(stock), "neutral"),
  ];

  const riskScore = clamp((100 - serviceLevel) * 4 + (stockoutDays / periods) * 60, 0, 100);

  return {
    headlineKpiKey: "service_level",
    kpis,
    series: [
      { key: "stock", label: "Stock level", color: "brand", points: stockSeries },
      { key: "demand", label: "Daily demand", color: "warning", points: demandSeries },
    ],
    table: { columns: ["Day", "Demand", "Stock", ""], rows: rows.map((r) => r.slice(0, 3)) },
    sensitivity: [
      { parameterKey: "reorderPoint", parameterLabel: "Reorder point", lowValue: reorderPoint * 0.7, highValue: reorderPoint * 1.3, outcomeDelta: round((reorderPoint / Math.max(1, dailyDemand * leadTime)) * 25, 1) },
      { parameterKey: "reorderQty", parameterLabel: "Reorder quantity", lowValue: reorderQty * 0.7, highValue: reorderQty * 1.3, outcomeDelta: 18 },
      { parameterKey: "demandVolatility", parameterLabel: "Demand volatility", lowValue: (volatility - 0.1) * 100, highValue: (volatility + 0.1) * 100, outcomeDelta: round(volatility * 90, 1) },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Stockout exposure", impact: stockoutDays === 0 ? "low" : stockoutDays <= periods * 0.1 ? "medium" : "high", detail: `${stockoutDays} stockout day(s) over ${periods}.` },
      { label: "Safety buffer", impact: reorderPoint >= dailyDemand * leadTime * 1.2 ? "low" : "medium", detail: `Reorder point covers ~${round(reorderPoint / Math.max(1, dailyDemand), 1)} days of demand.` },
    ]),
    outcomeSummary: `Service level ${formatPercent(serviceLevel)} with ${stockoutDays} stockout day(s) and ${ordersPlaced} replenishment order(s) over ${periods} days.`,
    trendSummary: serviceLevel >= 98 ? "Inventory policy comfortably meets demand." : serviceLevel >= 92 ? "Policy mostly holds but has stockout exposure." : "Policy is under-provisioned for demand volatility.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Model: competitive dynamics (Lanchester / share attrition)
// ──────────────────────────────────────────────────────────────────────────

function runCompetitiveDynamics(params: Params): Omit<SimulationResult, "constraintChecks"> {
  let ours = Math.max(0, num(params, "ourStrength", 1000));
  let rival = Math.max(0, num(params, "rivalStrength", 1200));
  const ourEff = num(params, "ourEffectiveness", 12) / 100;
  const rivalEff = num(params, "rivalEffectiveness", 10) / 100;
  const periods = clamp(Math.round(num(params, "periods", 20)), 2, 120);
  const model = str(params, "model", "lanchester_square");
  const ourStart = ours;
  const rivalStart = rival;

  const ourSeries: { x: number; y: number }[] = [{ x: 0, y: round(ours, 0) }];
  const rivalSeries: { x: number; y: number }[] = [{ x: 0, y: round(rival, 0) }];
  const shareSeries: { x: number; y: number }[] = [{ x: 0, y: round((ours / Math.max(1, ours + rival)) * 100, 1) }];
  const rows: string[][] = [];

  for (let t = 1; t <= periods; t += 1) {
    let ourLoss: number;
    let rivalLoss: number;
    if (model === "lanchester_square") {
      ourLoss = rivalEff * rival;
      rivalLoss = ourEff * ours;
    } else if (model === "lanchester_linear") {
      ourLoss = rivalEff * Math.min(ours, rival);
      rivalLoss = ourEff * Math.min(ours, rival);
    } else {
      // market share contest
      const total = ours + rival;
      ourLoss = rivalEff * rival * (rival / Math.max(1, total));
      rivalLoss = ourEff * ours * (ours / Math.max(1, total));
    }
    ours = Math.max(0, ours - ourLoss);
    rival = Math.max(0, rival - rivalLoss);
    ourSeries.push({ x: t, y: round(ours, 0) });
    rivalSeries.push({ x: t, y: round(rival, 0) });
    shareSeries.push({ x: t, y: round((ours / Math.max(1, ours + rival)) * 100, 1) });
    rows.push([`P${t}`, formatNumber(ours), formatNumber(rival), formatPercent((ours / Math.max(1, ours + rival)) * 100)]);
  }

  const finalShare = (ours / Math.max(1, ours + rival)) * 100;
  const winner = ours === rival ? "Stalemate" : ours > rival ? "Our position prevails" : "Rival prevails";
  const attrition = (ourStart - ours) / Math.max(1, rivalStart - rival);

  const kpis: ResultKpi[] = [
    kpi("final_share", "Final market share", finalShare, formatPercent(finalShare), finalShare >= 55 ? "success" : finalShare >= 45 ? "info" : "danger"),
    kpi("our_remaining", "Our remaining strength", ours, formatNumber(ours), "info"),
    kpi("rival_remaining", "Rival remaining strength", rival, formatNumber(rival), "neutral"),
    kpi("attrition_ratio", "Attrition ratio", attrition, round(attrition, 2).toString(), attrition <= 1 ? "success" : "warning"),
  ];

  const riskScore = clamp((50 - finalShare) * 2 + (attrition > 1 ? 25 : 0), 0, 100);

  return {
    headlineKpiKey: "final_share",
    kpis,
    series: [
      { key: "ours", label: "Our strength", color: "brand", points: ourSeries },
      { key: "rival", label: "Rival strength", color: "danger", points: rivalSeries },
      { key: "share", label: "Our share %", color: "ai", points: shareSeries },
    ],
    table: { columns: ["Period", "Ours", "Rival", "Our share"], rows },
    sensitivity: [
      { parameterKey: "ourEffectiveness", parameterLabel: "Our effectiveness", lowValue: (ourEff - 0.03) * 100, highValue: (ourEff + 0.03) * 100, outcomeDelta: round(ourEff * 220, 1) },
      { parameterKey: "ourStrength", parameterLabel: "Our starting strength", lowValue: ourStart * 0.9, highValue: ourStart * 1.1, outcomeDelta: 16 },
      { parameterKey: "rivalEffectiveness", parameterLabel: "Rival effectiveness", lowValue: (rivalEff - 0.03) * 100, highValue: (rivalEff + 0.03) * 100, outcomeDelta: round(rivalEff * 220, 1) },
    ],
    risk: riskFromScore(riskScore, [
      { label: "Competitive position", impact: finalShare >= 55 ? "low" : finalShare >= 45 ? "medium" : "high", detail: `Projected final share ${formatPercent(finalShare)}.` },
      { label: "Attrition efficiency", impact: attrition <= 1 ? "low" : "high", detail: `Attrition ratio ${round(attrition, 2)} (lower is better).` },
    ]),
    outcomeSummary: `${winner}: projected final share ${formatPercent(finalShare)} after ${periods} periods (${model.replace(/_/g, " ")} model).`,
    trendSummary: finalShare >= 55 ? "Position strengthens over the horizon." : finalShare >= 45 ? "Closely contested race." : "Position erodes; intervention needed.",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────────────────────────────────

export function runSimulationModel(
  modelKey: ModelKey,
  parameters: Params,
  seed: number,
  constraints: SimulationConstraint[] = [],
): SimulationResult {
  let partial: Omit<SimulationResult, "constraintChecks">;
  switch (modelKey) {
    case "market_adoption":
      partial = runMarketAdoption(parameters);
      break;
    case "demand_forecast":
      partial = runDemandForecast(parameters, seed);
      break;
    case "revenue_projection":
      partial = runRevenueProjection(parameters, seed);
      break;
    case "pricing_sensitivity":
      partial = runPricingSensitivity(parameters);
      break;
    case "inventory_simulation":
      partial = runInventorySimulation(parameters, seed);
      break;
    case "competitive_dynamics":
      partial = runCompetitiveDynamics(parameters);
      break;
    default:
      partial = runDemandForecast(parameters, seed);
  }
  return { ...partial, constraintChecks: checkConstraints(constraints, partial.kpis) };
}

// Progress staging used by the execution center to give a live run experience.
export const RUN_STAGES: Array<{ at: number; message: string }> = [
  { at: 5, message: "Validating scenario parameters" },
  { at: 18, message: "Loading model and assumptions" },
  { at: 35, message: "Initialising deterministic seed" },
  { at: 55, message: "Executing model iterations" },
  { at: 74, message: "Aggregating outputs and KPIs" },
  { at: 88, message: "Running risk and sensitivity analysis" },
  { at: 96, message: "Generating insights and recommendations" },
  { at: 100, message: "Run completed" },
];
