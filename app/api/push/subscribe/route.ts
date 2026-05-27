import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UnsafeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  from: (relation: string) => {
    upsert: (values: Record<string, unknown>, options: Record<string, unknown>) => {
      select?: never;
    } & Promise<{ error: Error | null }>;
  };
};

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(8),
    auth: z.string().min(8),
  }),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = PushSubscriptionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh_key: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
      user_agent: request.headers.get("user-agent"),
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: "Unable to save push subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
