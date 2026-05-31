// KARTEX Phase N — Platform Documentation Hub (Section N.10)

import type { DocSection } from "./types";

export const docSections: DocSection[] = [
  {
    id: "architecture",
    title: "Architecture",
    icon: "Layers",
    summary: "How the platform is structured across subsystems and layers.",
    items: [
      {
        heading: "Layered design",
        body: "Six intelligence-flow subsystems (Research, Knowledge, Simulation, SECIS, Governance, Execution) sit on two cross-cutting fabrics: the Integration Layer (contracts and data flow) and the Workspace Layer (operator surfaces).",
      },
      {
        heading: "Deterministic engines",
        body: "Each subsystem is implemented as a typed, deterministic engine, making behaviour reproducible and fully testable.",
      },
      {
        heading: "Closed loop",
        body: "Outputs of each stage become the inputs of the next, so the platform forms a closed loop from raw signal to measured outcome.",
      },
    ],
  },
  {
    id: "capabilities",
    title: "Capabilities",
    icon: "Sparkles",
    summary: "What each subsystem can do.",
    items: [
      { heading: "Research OS", body: "Signal ingestion, evidence synthesis, source traceability, hypothesis seeding." },
      { heading: "Knowledge OS", body: "Knowledge graph, belief revision, drift detection, concept lineage." },
      { heading: "Simulation OS", body: "Scenario modelling, outcome forecasting, what-if and sensitivity analysis." },
      { heading: "SECIS", body: "Threat detection, data-poisoning defence, calibration, integrity scoring." },
      { heading: "Governance OS", body: "Decision review, approval workflow, risk signals, audit trail." },
      { heading: "Execution OS", body: "Action plans, initiatives, programs, KPI tracking, outcome measurement, decision activation." },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    icon: "Workflow",
    summary: "How work flows through the platform.",
    items: [
      {
        heading: "Intelligence flow",
        body: "Research → Knowledge → Simulation → SECIS → Governance → Execution. Each demo scenario is a concrete instance of this workflow.",
      },
      {
        heading: "Decision activation",
        body: "An approved governance decision is activated into an initiative and action plan with no manual re-entry, then tracked to a measured outcome.",
      },
      {
        heading: "Execution lifecycle",
        body: "Work moves through draft → planned → approved → executing → (blocked) → completed → archived, with every transition audited.",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: "Network",
    summary: "How subsystems and external systems connect.",
    items: [
      {
        heading: "Shared contracts",
        body: "Typed API envelopes and shared contracts let subsystems exchange intelligence reliably.",
      },
      {
        heading: "In-app surfaces",
        body: "Governance and Execution are operable from the Workspace at /admin/dashboard and /admin/execution.",
      },
      {
        heading: "Public showcase",
        body: "The Platform Map (/platform) and Showcase Mode (/showcase) are public, requiring no login, for demonstrations.",
      },
    ],
  },
  {
    id: "user-guides",
    title: "User Guides",
    icon: "BookOpen",
    summary: "How a person uses the platform.",
    items: [
      {
        heading: "Understand it in minutes",
        body: "Start at /platform, read the Storyboard and Value Explanation, then run the Complete Platform Tour.",
      },
      {
        heading: "Demonstrate it",
        body: "Open /showcase, pick a scenario (e.g. Supplier Failure) and step through the end-to-end story full-screen.",
      },
      {
        heading: "Operate it",
        body: "Authenticated operators use the Workspace and Execution dashboards to create and track real work.",
      },
    ],
  },
  {
    id: "platform-guides",
    title: "Platform Guides",
    icon: "Compass",
    summary: "Guidance for evaluators and builders.",
    items: [
      {
        heading: "For judges & investors",
        body: "Use Showcase Mode and the Business Value Dashboard to see impact in business terms within minutes.",
      },
      {
        heading: "For faculty & mentors",
        body: "Use the Platform Map and Documentation Hub to inspect architecture, capabilities and workflows.",
      },
      {
        heading: "For builders",
        body: "Each subsystem maps to a deterministic engine under lib/, with tests under tests/unit and reports under docs/.",
      },
    ],
  },
];
