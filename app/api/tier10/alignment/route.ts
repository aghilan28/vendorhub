import { errorJson, okJson } from "@/lib/api/response";
import { detectAlignmentDrift } from "@/lib/tier10";

export async function POST(request: Request) {
  try {
    return okJson(detectAlignmentDrift(await request.json()));
  } catch (error) {
    return errorJson(error);
  }
}
