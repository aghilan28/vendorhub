import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { runGovernanceDetectionAction } from "@/features/governance/server";

const DetectionSchema = z.object({
  batchSize: z.number().int().min(1).max(500).default(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = DetectionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid governance detection request." }, { status: 400 });

    const result = await runGovernanceDetectionAction(parsed.data.batchSize);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "AUTH_REQUIRED" ? 401 : error.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    return NextResponse.json({ error: "Governance detection failed." }, { status: 500 });
  }
}
