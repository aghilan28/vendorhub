// KARTEX Phase N — Business Value Dashboard metrics (Section N.8)
// Demonstration metrics that express the platform's value in business terms.

import type { ValueMetric } from "./types";

export const valueMetrics: ValueMetric[] = [
  {
    id: "revenue-impact",
    label: "Revenue Impact",
    value: "+18%",
    caption: "Revenue captured or protected across demonstrated scenarios.",
    trend: [4, 7, 9, 12, 15, 18],
    tone: "positive",
  },
  {
    id: "risk-reduction",
    label: "Risk Reduction",
    value: "-34%",
    caption: "Exposure reduced through detection, simulation and governed response.",
    trend: [0, -8, -15, -22, -29, -34],
    tone: "positive",
  },
  {
    id: "decision-quality",
    label: "Decision Quality",
    value: "92/100",
    caption: "Decisions backed by evidence, simulation and integrity checks.",
    trend: [61, 70, 78, 84, 89, 92],
    tone: "positive",
  },
  {
    id: "execution-efficiency",
    label: "Execution Efficiency",
    value: "+47%",
    caption: "Faster decision-to-outcome cycle via decision activation.",
    trend: [10, 18, 27, 35, 41, 47],
    tone: "positive",
  },
  {
    id: "knowledge-reuse",
    label: "Knowledge Reuse",
    value: "3.6x",
    caption: "Reuse of validated knowledge instead of rediscovery.",
    trend: [1, 1.6, 2.2, 2.8, 3.2, 3.6],
    tone: "positive",
  },
  {
    id: "operational-impact",
    label: "Operational Impact",
    value: "+41%",
    caption: "Service levels and operational reliability improvements.",
    trend: [8, 16, 24, 31, 37, 41],
    tone: "positive",
  },
  {
    id: "strategic-impact",
    label: "Strategic Impact",
    value: "High",
    caption: "Closed loop from research to measured strategic outcomes.",
    trend: [20, 35, 50, 65, 80, 90],
    tone: "positive",
  },
];
