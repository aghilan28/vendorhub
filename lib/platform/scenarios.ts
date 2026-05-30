// KARTEX Phase N — Demo Scenario Center (Section N.4)
// Prebuilt, end-to-end demonstrations. Every scenario walks the full
// intelligence flow (Research → Knowledge → Simulation → SECIS → Governance →
// Execution) so a viewer sees the whole platform working as one system.

import type { DemoScenario } from "./types";

export const scenarios: DemoScenario[] = [
  {
    id: "supplier-failure",
    title: "Supplier Failure",
    domain: "supply-chain",
    severity: "critical",
    trigger: "A tier-1 supplier misses commitments and signals insolvency risk.",
    summary:
      "A key supplier fails. KARTEX detects the signal, recalls what it knows, simulates the blast radius, validates the data, governs the response, and executes a recovery plan.",
    stages: [
      { subsystemId: "research", action: "Ingests delivery-miss signals, news and financial indicators", output: "Sourced evidence: supplier reliability is collapsing" },
      { subsystemId: "knowledge", action: "Links the supplier to affected SKUs, regions and alternates", output: "Connected map of exposure and substitute suppliers" },
      { subsystemId: "simulation", action: "Models stock-out timing and revenue at risk across scenarios", output: "Forecast: 14-day stock-out, revenue at risk quantified" },
      { subsystemId: "secis", action: "Validates signals against manipulation and stale data", output: "Confidence calibrated; no data-poisoning detected" },
      { subsystemId: "governance", action: "Reviews options and approves a dual-sourcing decision", output: "Approved, audited decision with owner assigned" },
      { subsystemId: "execution", action: "Activates a recovery initiative with action plans and KPIs", output: "Owned recovery plan tracking to a measured outcome" },
    ],
    impact: [
      { label: "Revenue protected", value: "$1.2M", tone: "positive" },
      { label: "Stock-out avoided", value: "14 days", tone: "positive" },
      { label: "Decision time", value: "hours, not weeks", tone: "positive" },
    ],
    outcome: "A supplier collapse becomes a controlled, recovered situation with a measurable outcome.",
  },
  {
    id: "demand-surge",
    title: "Demand Surge",
    domain: "commerce",
    severity: "high",
    trigger: "A product unexpectedly goes viral and demand spikes 6x in 48 hours.",
    summary:
      "Sudden demand could mean lost sales or overcommitment. KARTEX turns the spike into a governed, executed scaling plan.",
    stages: [
      { subsystemId: "research", action: "Detects the demand spike across channels and search", output: "Evidence: 6x demand surge, concentrated in two regions" },
      { subsystemId: "knowledge", action: "Recalls elasticity, fulfilment limits and past surges", output: "Context: capacity ceilings and historical surge patterns" },
      { subsystemId: "simulation", action: "Forecasts revenue capture vs fulfilment-failure risk", output: "Optimal allocation and replenishment schedule" },
      { subsystemId: "secis", action: "Checks the surge is organic, not bot-driven manipulation", output: "Verified genuine demand; integrity confirmed" },
      { subsystemId: "governance", action: "Approves a scale-up and inventory reallocation", output: "Authorised scaling decision with guardrails" },
      { subsystemId: "execution", action: "Launches a fulfilment initiative and tracks SLA KPIs", output: "Executed scale-up with monitored service levels" },
    ],
    impact: [
      { label: "Revenue captured", value: "+38%", tone: "positive" },
      { label: "Fulfilment SLA held", value: "96%", tone: "positive" },
      { label: "Overstock avoided", value: "Yes", tone: "positive" },
    ],
    outcome: "A chaotic spike becomes captured revenue without breaking fulfilment.",
  },
  {
    id: "inventory-crisis",
    title: "Inventory Crisis",
    domain: "inventory",
    severity: "high",
    trigger: "Aging stock and imbalanced distribution threaten margin and shelf space.",
    summary:
      "Inventory is in the wrong place at the wrong time. KARTEX rebalances it through evidence, simulation and governed execution.",
    stages: [
      { subsystemId: "research", action: "Surfaces aging stock, sell-through and regional imbalance", output: "Evidence: dead stock and misallocation hotspots" },
      { subsystemId: "knowledge", action: "Connects SKUs to demand, shelf-life and transfer cost", output: "Rebalancing constraints and opportunities mapped" },
      { subsystemId: "simulation", action: "Models markdown vs transfer vs hold strategies", output: "Forecast: optimal mix of transfers and markdowns" },
      { subsystemId: "secis", action: "Validates inventory data against reconciliation errors", output: "Clean, trusted inventory baseline" },
      { subsystemId: "governance", action: "Approves a rebalancing and markdown policy", output: "Authorised inventory action with budget" },
      { subsystemId: "execution", action: "Runs transfers and markdowns; tracks margin KPIs", output: "Executed rebalancing with measured margin recovery" },
    ],
    impact: [
      { label: "Margin recovered", value: "+11%", tone: "positive" },
      { label: "Dead stock cleared", value: "63%", tone: "positive" },
      { label: "Carrying cost", value: "-19%", tone: "positive" },
    ],
    outcome: "Trapped capital in dead stock is freed and margin is recovered.",
  },
  {
    id: "pricing-change",
    title: "Pricing Change",
    domain: "pricing",
    severity: "moderate",
    trigger: "Competitor moves and elasticity shifts call for a pricing review.",
    summary:
      "A pricing change is high-risk if guessed. KARTEX grounds it in evidence, simulates elasticity, and governs the rollout.",
    stages: [
      { subsystemId: "research", action: "Gathers competitor pricing and elasticity signals", output: "Evidence: competitive gaps and price sensitivity" },
      { subsystemId: "knowledge", action: "Recalls margin floors, bundles and prior experiments", output: "Pricing constraints and known elasticity curves" },
      { subsystemId: "simulation", action: "Forecasts revenue and volume across price points", output: "Recommended price band with revenue forecast" },
      { subsystemId: "secis", action: "Checks signals for manipulation and over-fitting", output: "Calibrated confidence on the elasticity estimate" },
      { subsystemId: "governance", action: "Approves a staged price change with rollback rules", output: "Authorised pricing decision with safeguards" },
      { subsystemId: "execution", action: "Rolls out pricing and tracks revenue/conversion KPIs", output: "Executed change with monitored outcome and rollback ready" },
    ],
    impact: [
      { label: "Revenue impact", value: "+7.4%", tone: "positive" },
      { label: "Margin impact", value: "+3.1%", tone: "positive" },
      { label: "Conversion risk", value: "contained", tone: "neutral" },
    ],
    outcome: "Pricing moves from guesswork to a governed, measured experiment.",
  },
  {
    id: "logistics-disruption",
    title: "Logistics Disruption",
    domain: "operations",
    severity: "high",
    trigger: "A regional disruption breaks delivery routes and spikes SLA breaches.",
    summary:
      "Delivery is failing in a region. KARTEX reroutes through simulation-validated changes and governed execution.",
    stages: [
      { subsystemId: "research", action: "Detects SLA breach spikes and carrier degradation", output: "Evidence: where and why deliveries are failing" },
      { subsystemId: "knowledge", action: "Recalls routes, carriers, hubs and contingency options", output: "Network map with alternates and constraints" },
      { subsystemId: "simulation", action: "Models rerouting and carrier-mix changes", output: "Routing plan that minimises breaches and cost" },
      { subsystemId: "secis", action: "Validates telemetry against faulty or stale sensors", output: "Trusted operational picture" },
      { subsystemId: "governance", action: "Approves rerouting and carrier reallocation", output: "Authorised logistics response" },
      { subsystemId: "execution", action: "Deploys routing changes; tracks SLA recovery KPIs", output: "Executed recovery with measured SLA improvement" },
    ],
    impact: [
      { label: "SLA breach reduction", value: "-41%", tone: "positive" },
      { label: "Recovery time", value: "< 1 day", tone: "positive" },
      { label: "Cost impact", value: "neutral", tone: "neutral" },
    ],
    outcome: "A logistics shock is absorbed and service levels are restored quickly.",
  },
  {
    id: "store-expansion",
    title: "Store Expansion",
    domain: "expansion",
    severity: "moderate",
    trigger: "Leadership wants to expand into three new markets.",
    summary:
      "Expansion is capital-intensive and risky. KARTEX evaluates markets and governs a staged, executed roll-out.",
    stages: [
      { subsystemId: "research", action: "Gathers market demand, competition and cost signals", output: "Evidence: market attractiveness per location" },
      { subsystemId: "knowledge", action: "Recalls expansion playbooks and unit economics", output: "Comparable economics and known risks" },
      { subsystemId: "simulation", action: "Forecasts ramp curves and payback per market", output: "Ranked markets with payback forecasts" },
      { subsystemId: "secis", action: "Stress-tests assumptions for over-optimism and bias", output: "Calibrated, de-biased projections" },
      { subsystemId: "governance", action: "Approves a phased expansion with stage gates", output: "Authorised expansion program with gates" },
      { subsystemId: "execution", action: "Launches expansion initiatives; tracks ramp KPIs", output: "Executed roll-out measured against forecasts" },
    ],
    impact: [
      { label: "Capital at risk reduced", value: "-28%", tone: "positive" },
      { label: "Payback clarity", value: "per market", tone: "positive" },
      { label: "Go/no-go", value: "evidence-based", tone: "neutral" },
    ],
    outcome: "Expansion becomes a staged, measured program instead of a bet.",
  },
  {
    id: "customer-growth",
    title: "Customer Growth",
    domain: "retail",
    severity: "low",
    trigger: "Retention is flat and acquisition cost is rising.",
    summary:
      "Growth is stalling. KARTEX finds the levers, simulates interventions, and executes a governed growth initiative.",
    stages: [
      { subsystemId: "research", action: "Analyses cohorts, churn drivers and acquisition channels", output: "Evidence: where growth leaks and which levers exist" },
      { subsystemId: "knowledge", action: "Recalls segment behaviour and prior growth experiments", output: "Segment playbooks and known lever effects" },
      { subsystemId: "simulation", action: "Forecasts LTV impact of retention vs acquisition spend", output: "Optimal growth-investment mix" },
      { subsystemId: "secis", action: "Validates attribution against vanity and gamed metrics", output: "Trustworthy growth attribution" },
      { subsystemId: "governance", action: "Approves a growth investment and target segments", output: "Authorised growth decision with budget" },
      { subsystemId: "execution", action: "Runs retention/acquisition initiatives; tracks LTV/CAC", output: "Executed growth program measured on LTV and CAC" },
    ],
    impact: [
      { label: "Retention lift", value: "+9%", tone: "positive" },
      { label: "CAC", value: "-14%", tone: "positive" },
      { label: "LTV/CAC", value: "improved", tone: "positive" },
    ],
    outcome: "Stalled growth becomes a measured, governed, improving engine.",
  },
];
