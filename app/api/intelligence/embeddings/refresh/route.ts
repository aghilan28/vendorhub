import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueAsyncJob, idempotencyKeyFor } from "@/lib/async/orchestrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const RefreshSchema = z.object({
  productId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("current_user_has_role", { required_roles: ["ADMIN", "SUPER_ADMIN"] });
  if (error || !data) return false;
  return true;
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const parsed = RefreshSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid embedding refresh request." }, { status: 400 });

  const result = await enqueueAsyncJob({
    name: parsed.data.productId ? "ai.embedding.refresh" : "ai.embedding.refresh_stale",
    payload: parsed.data.productId ? { productId: parsed.data.productId } : { limit: parsed.data.limit },
    idempotencyKey: parsed.data.productId
      ? idempotencyKeyFor(["embedding-refresh", parsed.data.productId])
      : idempotencyKeyFor(["embedding-refresh-stale", parsed.data.limit, new Date().toISOString().slice(0, 13)]),
    priority: parsed.data.productId ? "normal" : "low",
  });

  return NextResponse.json({ accepted: true, durable: true, job: result }, { status: 202 });
}
