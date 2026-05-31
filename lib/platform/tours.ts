// KARTEX Phase N — Platform Tour (Section N.3)
// Guided, interactive walkthroughs: one per subsystem plus a complete tour.

import { subsystems } from "./subsystems";
import type { Subsystem, Tour } from "./types";

function subsystemTour(subsystem: Subsystem): Tour {
  return {
    id: `tour-${subsystem.id}`,
    title: `${subsystem.name} Tour`,
    audience: "Anyone new to this subsystem",
    durationMinutes: 2,
    steps: [
      {
        title: `Meet ${subsystem.name}`,
        body: `${subsystem.tagline} — ${subsystem.what}`,
        subsystemId: subsystem.id,
        route: subsystem.route,
      },
      {
        title: "The problem it solves",
        body: subsystem.problem,
        subsystemId: subsystem.id,
      },
      {
        title: "Why it matters",
        body: subsystem.why,
        subsystemId: subsystem.id,
      },
      {
        title: "The value it creates",
        body: `${subsystem.value} Key capabilities: ${subsystem.capabilities.join(", ")}.`,
        subsystemId: subsystem.id,
      },
    ],
  };
}

const completeTour: Tour = {
  id: "tour-complete",
  title: "Complete Platform Tour",
  audience: "Judges, investors, faculty, new users",
  durationMinutes: 6,
  steps: [
    {
      title: "What KARTEX is",
      body: "KARTEX is a closed-loop decision platform: it turns raw signals into research, research into knowledge, knowledge into simulated foresight, foresight into trusted and governed decisions, and decisions into measured execution.",
      subsystemId: null,
      route: "/platform",
    },
    ...subsystems
      .filter((s) => s.layerKind === "flow")
      .sort((a, b) => (a.flowOrder ?? 0) - (b.flowOrder ?? 0))
      .map((s) => ({
        title: `${s.flowOrder}. ${s.name}`,
        body: `${s.tagline} ${s.value}`,
        subsystemId: s.id,
        route: s.route,
      })),
    {
      title: "Integration Layer — the connective fabric",
      body: "The Integration Layer binds every subsystem with shared contracts so intelligence flows with no manual re-entry.",
      subsystemId: "integration",
    },
    {
      title: "Workspace Layer — the human surface",
      body: "The Workspace Layer is where people see, navigate and operate the whole platform.",
      subsystemId: "workspace",
      route: "/admin/dashboard",
    },
    {
      title: "See it end-to-end",
      body: "Run a demo scenario in Showcase Mode to watch a real situation flow through all six stages to a measured outcome.",
      subsystemId: null,
      route: "/showcase",
    },
  ],
};

export const tours: Tour[] = [
  completeTour,
  ...subsystems
    .slice()
    .sort((a, b) => (a.flowOrder ?? 99) - (b.flowOrder ?? 99))
    .map(subsystemTour),
];
