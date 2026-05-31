// KARTEX Phase O.10 — Platform Documentation (audience guides)
// In-app guides for the /platform/docs hub. These complement the capability-
// oriented docSections with audience-oriented walkthroughs.

export interface GuideSection {
  heading: string;
  body: string;
}

export interface PlatformGuide {
  id: string;
  title: string;
  audience: string;
  icon: string;
  summary: string;
  sections: GuideSection[];
}

export const platformGuides: PlatformGuide[] = [
  {
    id: "platform",
    title: "Platform Guide",
    audience: "Everyone",
    icon: "Compass",
    summary: "What KARTEX is and how to move around it.",
    sections: [
      {
        heading: "What it is",
        body: "KARTEX is a closed-loop commerce intelligence platform. It turns signals into research, research into knowledge, knowledge into simulated foresight, foresight into trusted and governed decisions, and decisions into measured execution.",
      },
      {
        heading: "Where to start",
        body: "Open /platform for the map, storyboard, value explanations, scenarios and tours. Open /showcase to present a scenario end-to-end. Operators use /admin/dashboard and /admin/execution.",
      },
      {
        heading: "How to navigate",
        body: "The /platform hub is tabbed: Platform Map, Storyboard, Value Explanation, Demo Scenarios, Use Cases, Business Value, Guided Tours, Search and Documentation.",
      },
    ],
  },
  {
    id: "architecture",
    title: "Architecture Guide",
    audience: "Engineers, faculty",
    icon: "Layers",
    summary: "How the platform is structured.",
    sections: [
      {
        heading: "Six flow subsystems",
        body: "Research → Knowledge → Simulation → SECIS → Governance → Execution. Each is a typed, deterministic engine; the output of one stage is the input of the next.",
      },
      {
        heading: "Two fabric layers",
        body: "The Integration Layer binds subsystems with shared contracts; the Workspace Layer is the human surface that operates them.",
      },
      {
        heading: "Determinism & tests",
        body: "Engines live under lib/ with deterministic models and unit tests under tests/unit, so behaviour is reproducible and verifiable.",
      },
    ],
  },
  {
    id: "capability",
    title: "Capability Guide",
    audience: "Product, analysts",
    icon: "Sparkles",
    summary: "What each subsystem can do.",
    sections: [
      { heading: "Research & Knowledge", body: "Signal ingestion, evidence synthesis and source traceability; a connected, versioned knowledge graph with drift detection." },
      { heading: "Simulation & SECIS", body: "Scenario modelling and outcome forecasting; epistemic-security threat detection, calibration and integrity scoring." },
      { heading: "Governance & Execution", body: "Decision review, approval and audit trail; action plans, initiatives, KPIs, outcomes and decision activation." },
    ],
  },
  {
    id: "user",
    title: "User Guide",
    audience: "New users",
    icon: "BookOpen",
    summary: "Use the platform without assistance.",
    sections: [
      { heading: "Understand it in minutes", body: "Read the /platform hero and Storyboard, then take the Complete Platform Tour." },
      { heading: "Explore a domain", body: "Open the Use Case Library, pick a domain (e.g. Supply Chain) and launch its scenario." },
      { heading: "Operate real work", body: "Authenticated operators create and track initiatives and action plans in /admin/execution." },
    ],
  },
  {
    id: "demo",
    title: "Demo Guide",
    audience: "Presenters",
    icon: "Play",
    summary: "Run a live demonstration.",
    sections: [
      { heading: "Pick a scenario", body: "Supplier Failure is the strongest end-to-end story; Demand Surge and Inventory Crisis are good alternatives." },
      { heading: "Run it", body: "Open /showcase, choose the scenario, and step Intro → six stages → measured outcome. Each stage shows what the subsystem does and what it produces." },
      { heading: "Close the loop", body: "End on the outcome beat: emphasise the quantified impact and that the outcome becomes a new signal." },
    ],
  },
  {
    id: "judge",
    title: "Judge Guide",
    audience: "Competition judges",
    icon: "Scale",
    summary: "Evaluate the platform in five minutes.",
    sections: [
      { heading: "Completeness", body: "Eight subsystems form one closed loop; every demo scenario covers all six intelligence stages end-to-end." },
      { heading: "Proof", body: "Open /showcase to see the flow; open the Business Value tab for impact in business terms; routes are certified in docs/o." },
      { heading: "Rigour", body: "Deterministic engines with unit tests; typecheck, lint, tests and build all pass." },
    ],
  },
  {
    id: "investor",
    title: "Investor Guide",
    audience: "Investors",
    icon: "Briefcase",
    summary: "The value story.",
    sections: [
      { heading: "Problem", body: "Organisations receive insights and recommendations but struggle to convert them into executed, measured outcomes." },
      { heading: "Solution", body: "KARTEX closes the loop from signal to measured outcome, with governance and execution built in." },
      { heading: "Value", body: "The Business Value Dashboard summarises revenue impact, risk reduction, decision quality, execution efficiency, knowledge reuse and operational/strategic impact." },
    ],
  },
  {
    id: "faculty",
    title: "Faculty Guide",
    audience: "Faculty, mentors",
    icon: "GraduationCap",
    summary: "Inspect the design and rigour.",
    sections: [
      { heading: "Architecture", body: "Use the Platform Map and Architecture Guide to inspect subsystems, dependencies and the intelligence flow." },
      { heading: "Verification", body: "Each subsystem maps to a deterministic engine under lib/ with tests under tests/unit and reports under docs/." },
      { heading: "Pedagogy", body: "The Storyboard and Value Explanation make the systems-thinking explicit and teachable." },
    ],
  },
];
