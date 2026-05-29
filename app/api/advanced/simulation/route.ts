import { z } from "zod";
import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { runSimulation } from "@/lib/advanced-intelligence/simulation";
import {
  bassDiffusion,
  calculateStructuralDemography,
  polyaUrnLockIn,
  runCivilizationalProjection,
  runHistoricalCalibration,
  simulateStrategicCompetition,
  simulateTechnologyCompetition,
} from "@/lib/tier10";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Schema = z.object({
  model: z.enum([
    "structural_demography",
    "civilizational_projection",
    "historical_calibration",
    "bass_diffusion",
    "polya_urn",
    "technology_competition",
    "strategic_competition",
  ]),
  inputs: z.record(z.string(), z.unknown()).default({}),
});

// Phase G — operationalized simulation runtime: stateful + audited wrapper around
// the (otherwise stateless/unauthenticated) Tier 10 simulation compute.
export async function POST(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "advanced.simulation.run", requireAuth: true, rateLimit: securityRateLimits.adminMutation, audit: true },
      async (context) => {
        const actor = requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        const { model, inputs } = Schema.parse(await request.json());
        const b = inputs as any;
        const compute = () => {
          switch (model) {
            case "structural_demography":
              return calculateStructuralDemography(b);
            case "civilizational_projection":
              return runCivilizationalProjection(b);
            case "historical_calibration":
              return runHistoricalCalibration(b);
            case "bass_diffusion":
              return bassDiffusion(b);
            case "polya_urn":
              return polyaUrnLockIn(b.initialCounts, b.draws, b.reinforcement);
            case "technology_competition":
              return simulateTechnologyCompetition(b.adoptionShares, b.fitness, b.steps);
            case "strategic_competition":
              return simulateStrategicCompetition(b);
          }
        };
        return runSimulation(model, inputs, compute, { actorId: actor.id, traceId: context.requestId });
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
