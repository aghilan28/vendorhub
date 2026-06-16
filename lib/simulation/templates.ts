// KARTEX M3 — Built-in simulation templates.
// Each template binds a deterministic model to a visual parameter schema so the
// Scenario Builder can render controls without any JSON editing.

import type { SimulationTemplate } from "./types";

export const SIMULATION_CATEGORIES = [
  "Growth",
  "Demand",
  "Finance",
  "Pricing",
  "Operations",
  "Strategy",
] as const;

export const BUILT_IN_TEMPLATES: SimulationTemplate[] = [
  {
    id: "tpl-market-adoption",
    modelKey: "market_adoption",
    name: "Market Adoption (Bass Diffusion)",
    summary: "Project how a new product, category, or vendor offering is adopted across a market over time.",
    category: "Growth",
    tags: ["adoption", "growth", "launch"],
    builtIn: true,
    variables: [
      { key: "new", label: "New adopters", unit: "users", description: "Adopters gained each period." },
      { key: "cumulative", label: "Cumulative adopters", unit: "users", description: "Total adopters to date." },
    ],
    parameters: [
      { key: "marketSize", label: "Addressable market", kind: "integer", defaultValue: 100000, min: 100, max: 5000000, step: 100, unit: "users", help: "Total reachable customers.", group: "Market" },
      { key: "innovation", label: "Innovation rate (p)", kind: "percent", defaultValue: 3, min: 0.1, max: 10, step: 0.1, unit: "%", help: "External influence — advertising and discovery.", group: "Adoption" },
      { key: "imitation", label: "Word-of-mouth (q)", kind: "percent", defaultValue: 38, min: 1, max: 90, step: 1, unit: "%", help: "Internal influence — peer recommendation.", group: "Adoption" },
      { key: "periods", label: "Periods", kind: "integer", defaultValue: 24, min: 4, max: 96, step: 1, unit: "months", help: "Forecast horizon.", group: "Horizon" },
      { key: "pricePerUnit", label: "Revenue per adopter", kind: "currency", defaultValue: 499, min: 0, max: 100000, step: 1, unit: "₹", help: "Average revenue captured per adopter.", group: "Revenue" },
    ],
    defaultAssumptions: ["Market size is stable over the horizon", "No major competitor launch mid-horizon"],
    defaultConstraints: [{ label: "Reach ≥ 50% penetration", metric: "penetration", operator: "gte", threshold: 50 }],
  },
  {
    id: "tpl-demand-forecast",
    modelKey: "demand_forecast",
    name: "Demand Forecast",
    summary: "Forecast unit demand with trend, seasonality, and a probabilistic confidence band.",
    category: "Demand",
    tags: ["forecast", "demand", "seasonality"],
    builtIn: true,
    variables: [
      { key: "forecast", label: "Forecast demand", unit: "units", description: "Expected demand per period." },
      { key: "upper", label: "Upper band", unit: "units", description: "P90 demand band." },
      { key: "lower", label: "Lower band", unit: "units", description: "P10 demand band." },
    ],
    parameters: [
      { key: "baseDemand", label: "Base demand", kind: "integer", defaultValue: 1200, min: 0, max: 1000000, step: 10, unit: "units", help: "Starting demand in period 1.", group: "Demand" },
      { key: "growthRate", label: "Growth rate / period", kind: "percent", defaultValue: 4, min: -20, max: 40, step: 0.5, unit: "%", help: "Underlying trend per period.", group: "Demand" },
      { key: "seasonality", label: "Seasonality amplitude", kind: "percent", defaultValue: 15, min: 0, max: 60, step: 1, unit: "%", help: "Peak-to-trough seasonal swing.", group: "Pattern" },
      { key: "volatility", label: "Volatility", kind: "percent", defaultValue: 8, min: 0, max: 50, step: 1, unit: "%", help: "Random period-to-period noise.", group: "Pattern" },
      { key: "periods", label: "Periods", kind: "integer", defaultValue: 18, min: 4, max: 96, step: 1, unit: "months", help: "Forecast horizon.", group: "Horizon" },
    ],
    defaultAssumptions: ["Seasonal pattern repeats on a 6-period cycle", "No structural demand shock in horizon"],
    defaultConstraints: [{ label: "Net growth ≥ 0%", metric: "growth", operator: "gte", threshold: 0 }],
  },
  {
    id: "tpl-revenue-projection",
    modelKey: "revenue_projection",
    name: "Revenue Projection (Monte Carlo)",
    summary: "Project revenue and profit with uncertainty using a seeded Monte-Carlo simulation.",
    category: "Finance",
    tags: ["revenue", "profit", "monte-carlo", "risk"],
    builtIn: true,
    variables: [
      { key: "revenue", label: "Revenue", unit: "₹", description: "Mean revenue per period." },
      { key: "profit", label: "Profit", unit: "₹", description: "Mean profit per period." },
    ],
    parameters: [
      { key: "units", label: "Units / period (start)", kind: "integer", defaultValue: 800, min: 0, max: 1000000, step: 10, unit: "units", help: "Starting volume.", group: "Volume" },
      { key: "price", label: "Unit price", kind: "currency", defaultValue: 650, min: 0, max: 1000000, step: 1, unit: "₹", help: "Average selling price.", group: "Economics" },
      { key: "costPerUnit", label: "Unit cost", kind: "currency", defaultValue: 280, min: 0, max: 1000000, step: 1, unit: "₹", help: "Variable cost per unit.", group: "Economics" },
      { key: "fixedCost", label: "Fixed cost / period", kind: "currency", defaultValue: 60000, min: 0, max: 100000000, step: 1000, unit: "₹", help: "Overhead per period.", group: "Economics" },
      { key: "growthRate", label: "Growth rate / period", kind: "percent", defaultValue: 6, min: -20, max: 40, step: 0.5, unit: "%", help: "Volume growth per period.", group: "Volume" },
      { key: "churnRate", label: "Churn rate / period", kind: "percent", defaultValue: 4, min: 0, max: 40, step: 0.5, unit: "%", help: "Volume lost per period.", group: "Volume" },
      { key: "volatility", label: "Volatility", kind: "percent", defaultValue: 12, min: 0, max: 60, step: 1, unit: "%", help: "Uncertainty in each period.", group: "Risk" },
      { key: "iterations", label: "Monte-Carlo runs", kind: "integer", defaultValue: 300, min: 50, max: 2000, step: 50, unit: "runs", help: "More runs = smoother distribution.", group: "Risk" },
      { key: "periods", label: "Periods", kind: "integer", defaultValue: 12, min: 2, max: 60, step: 1, unit: "months", help: "Projection horizon.", group: "Horizon" },
    ],
    defaultAssumptions: ["Price held constant across horizon", "Cost structure does not change materially"],
    defaultConstraints: [
      { label: "Probability of loss ≤ 20%", metric: "loss_probability", operator: "lte", threshold: 20 },
      { label: "Margin ≥ 10%", metric: "margin", operator: "gte", threshold: 10 },
    ],
  },
  {
    id: "tpl-pricing-sensitivity",
    modelKey: "pricing_sensitivity",
    name: "Pricing Sensitivity & Optimization",
    summary: "Sweep price across a range to find the profit-optimal point using demand elasticity.",
    category: "Pricing",
    tags: ["pricing", "elasticity", "optimization"],
    builtIn: true,
    variables: [
      { key: "profit", label: "Profit", unit: "₹", description: "Profit at each price point." },
      { key: "revenue", label: "Revenue", unit: "₹", description: "Revenue at each price point." },
    ],
    parameters: [
      { key: "basePrice", label: "Current price", kind: "currency", defaultValue: 500, min: 1, max: 1000000, step: 1, unit: "₹", help: "Today's price.", group: "Pricing" },
      { key: "baseDemand", label: "Demand at current price", kind: "integer", defaultValue: 1000, min: 0, max: 1000000, step: 10, unit: "units", help: "Volume sold at current price.", group: "Pricing" },
      { key: "elasticity", label: "Price elasticity", kind: "number", defaultValue: -1.4, min: -3, max: -0.2, step: 0.1, help: "% demand change per % price change (negative).", group: "Pricing" },
      { key: "costPerUnit", label: "Unit cost", kind: "currency", defaultValue: 220, min: 0, max: 1000000, step: 1, unit: "₹", help: "Variable cost per unit.", group: "Economics" },
      { key: "priceMin", label: "Sweep min price", kind: "currency", defaultValue: 300, min: 1, max: 1000000, step: 1, unit: "₹", help: "Lowest price tested.", group: "Sweep" },
      { key: "priceMax", label: "Sweep max price", kind: "currency", defaultValue: 900, min: 1, max: 1000000, step: 1, unit: "₹", help: "Highest price tested.", group: "Sweep" },
      { key: "steps", label: "Sweep steps", kind: "integer", defaultValue: 24, min: 4, max: 120, step: 1, unit: "points", help: "Resolution of the sweep.", group: "Sweep" },
    ],
    defaultAssumptions: ["Constant elasticity across the price range", "Competitors do not respond to price moves"],
    defaultConstraints: [{ label: "Profit uplift ≥ 0%", metric: "uplift_vs_base", operator: "gte", threshold: 0 }],
  },
  {
    id: "tpl-inventory",
    modelKey: "inventory_simulation",
    name: "Inventory & Replenishment",
    summary: "Simulate stock levels under volatile demand with a reorder point and lead time.",
    category: "Operations",
    tags: ["inventory", "stock", "service-level"],
    builtIn: true,
    variables: [
      { key: "stock", label: "Stock level", unit: "units", description: "On-hand stock each day." },
      { key: "demand", label: "Daily demand", unit: "units", description: "Demand each day." },
    ],
    parameters: [
      { key: "initialStock", label: "Starting stock", kind: "integer", defaultValue: 500, min: 0, max: 1000000, step: 10, unit: "units", help: "On-hand units at day 0.", group: "Inventory" },
      { key: "dailyDemand", label: "Average daily demand", kind: "number", defaultValue: 60, min: 0, max: 100000, step: 1, unit: "units", help: "Mean units sold per day.", group: "Demand" },
      { key: "demandVolatility", label: "Demand volatility", kind: "percent", defaultValue: 30, min: 0, max: 100, step: 1, unit: "%", help: "Variability in daily demand.", group: "Demand" },
      { key: "reorderPoint", label: "Reorder point", kind: "integer", defaultValue: 200, min: 0, max: 1000000, step: 10, unit: "units", help: "Stock level that triggers a reorder.", group: "Policy" },
      { key: "reorderQty", label: "Reorder quantity", kind: "integer", defaultValue: 400, min: 1, max: 1000000, step: 10, unit: "units", help: "Units ordered each replenishment.", group: "Policy" },
      { key: "leadTime", label: "Lead time", kind: "integer", defaultValue: 4, min: 0, max: 60, step: 1, unit: "days", help: "Days until an order arrives.", group: "Policy" },
      { key: "periods", label: "Days simulated", kind: "integer", defaultValue: 30, min: 7, max: 180, step: 1, unit: "days", help: "Simulation horizon.", group: "Horizon" },
    ],
    defaultAssumptions: ["Single SKU, single warehouse", "No supplier failures during lead time"],
    defaultConstraints: [{ label: "Service level ≥ 95%", metric: "service_level", operator: "gte", threshold: 95 }],
  },
  {
    id: "tpl-competitive",
    modelKey: "competitive_dynamics",
    name: "Competitive Dynamics",
    summary: "Model a competitive contest for market position using Lanchester / share-attrition dynamics.",
    category: "Strategy",
    tags: ["competition", "market-share", "strategy"],
    builtIn: true,
    variables: [
      { key: "ours", label: "Our strength", description: "Our competitive position over time." },
      { key: "rival", label: "Rival strength", description: "Rival position over time." },
      { key: "share", label: "Our share %", unit: "%", description: "Our market share over time." },
    ],
    parameters: [
      { key: "ourStrength", label: "Our starting strength", kind: "number", defaultValue: 1000, min: 1, max: 1000000, step: 10, help: "Our initial competitive resource.", group: "Position" },
      { key: "rivalStrength", label: "Rival starting strength", kind: "number", defaultValue: 1200, min: 1, max: 1000000, step: 10, help: "Rival initial resource.", group: "Position" },
      { key: "ourEffectiveness", label: "Our effectiveness", kind: "percent", defaultValue: 12, min: 1, max: 50, step: 1, unit: "%", help: "How efficiently we win share.", group: "Effectiveness" },
      { key: "rivalEffectiveness", label: "Rival effectiveness", kind: "percent", defaultValue: 10, min: 1, max: 50, step: 1, unit: "%", help: "How efficiently the rival wins share.", group: "Effectiveness" },
      {
        key: "model",
        label: "Contest model",
        kind: "select",
        defaultValue: "lanchester_square",
        help: "Dynamics governing attrition.",
        group: "Model",
        options: [
          { value: "lanchester_square", label: "Lanchester square (aimed)" },
          { value: "lanchester_linear", label: "Lanchester linear (attrition)" },
          { value: "share", label: "Market-share contest" },
        ],
      },
      { key: "periods", label: "Periods", kind: "integer", defaultValue: 20, min: 2, max: 96, step: 1, unit: "quarters", help: "Contest horizon.", group: "Horizon" },
    ],
    defaultAssumptions: ["Two-player contest", "Effectiveness is stable over the horizon"],
    defaultConstraints: [{ label: "Final share ≥ 50%", metric: "final_share", operator: "gte", threshold: 50 }],
  },
];

export function getTemplate(templateId: string): SimulationTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplateByModel(modelKey: string): SimulationTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.modelKey === modelKey);
}

export function defaultParameters(template: SimulationTemplate): Record<string, number | string> {
  const params: Record<string, number | string> = {};
  for (const p of template.parameters) params[p.key] = p.defaultValue;
  return params;
}
