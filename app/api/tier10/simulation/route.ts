import { errorJson, okJson } from "@/lib/api/response";
import {
  bassDiffusion,
  calculateStructuralDemography,
  polyaUrnLockIn,
  runCivilizationalProjection,
  runHistoricalCalibration,
  simulateStrategicCompetition,
  simulateTechnologyCompetition,
} from "@/lib/tier10";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.kind === "structural_demography") return okJson(calculateStructuralDemography(body));
    if (body.kind === "civilizational_projection") return okJson(runCivilizationalProjection(body));
    if (body.kind === "historical_calibration") return okJson(runHistoricalCalibration(body));
    if (body.kind === "bass_diffusion") return okJson(bassDiffusion(body));
    if (body.kind === "polya_urn") return okJson(polyaUrnLockIn(body.initialCounts, body.draws, body.reinforcement));
    if (body.kind === "technology_competition") return okJson(simulateTechnologyCompetition(body.adoptionShares, body.fitness, body.steps));
    if (body.kind === "strategic_competition") return okJson(simulateStrategicCompetition(body));

    return okJson({
      acceptedKinds: [
        "structural_demography",
        "civilizational_projection",
        "historical_calibration",
        "bass_diffusion",
        "polya_urn",
        "technology_competition",
        "strategic_competition",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
