import { z } from "zod";
import { AppError } from "@/lib/errors";
import { hashRequestBody } from "@/lib/security/replay";
import type { Json } from "@/types/database";
import { enqueueAsyncJob, idempotencyKeyFor, persistDurableEvent } from "./orchestrator";
import { createAsyncSupabaseClient } from "./supabase-unsafe";

const RazorpayWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
});

type WebhookIngestionRecord = {
  id: string;
  state: string;
  async_job_id: string | null;
};

function safeHeaders(headers: Headers) {
  return {
    eventId: headers.get("x-razorpay-event-id"),
    timestamp: headers.get("x-razorpay-event-timestamp") ?? headers.get("x-razorpay-timestamp"),
    userAgent: headers.get("user-agent"),
  };
}

export async function ingestRazorpayWebhook(input: {
  rawBody: string;
  signature: string | null;
  headers: Headers;
  signatureValid: boolean;
}) {
  const parsedJson = JSON.parse(input.rawBody) as Json;
  const parsed = RazorpayWebhookSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid Razorpay webhook payload.", parsed.error.flatten());
  }

  const rawBodyHash = hashRequestBody(input.rawBody);
  const providerEventId = input.headers.get("x-razorpay-event-id");
  const eventId = providerEventId ?? rawBodyHash;
  const eventHash = idempotencyKeyFor(["razorpay", parsed.data.event, rawBodyHash]);
  const supabase = createAsyncSupabaseClient();

  const { data: existingData } = await supabase
    .from("webhook_ingestions")
    .select("id,state,async_job_id")
    .eq("provider", "razorpay")
    .eq("event_id", eventId)
    .maybeSingle();
  const existing = existingData as WebhookIngestionRecord | null;

  if (existing?.state === "PROCESSED" || existing?.state === "QUEUED" || existing?.state === "PROCESSING") {
    return { duplicate: true, ingestionId: existing.id, jobId: existing.async_job_id, state: existing.state };
  }

  const { data: ingestionData, error } = await supabase
    .from("webhook_ingestions")
    .upsert(
      {
        provider: "razorpay",
        event_id: eventId,
        event_hash: eventHash,
        event_type: parsed.data.event,
        signature_valid: input.signatureValid,
        headers: safeHeaders(input.headers),
        raw_payload: parsedJson,
        raw_body_hash: rawBodyHash,
        state: "RECEIVED",
        metadata: { hasProviderEventId: Boolean(providerEventId) },
      },
      { onConflict: "provider,event_id" },
    )
    .select("id,state")
    .single();
  const ingestion = ingestionData as Pick<WebhookIngestionRecord, "id" | "state"> | null;

  if (error || !ingestion) {
    throw new AppError("DATABASE_ERROR", "Webhook could not be persisted durably.", error);
  }

  await persistDurableEvent({
    source: "razorpay",
    eventKey: eventId,
    eventType: parsed.data.event,
    payload: parsedJson,
    subjectType: "payment_webhook",
    subjectId: ingestion.id,
    metadata: { rawBodyHash, signatureValid: input.signatureValid },
  });

  const job = await enqueueAsyncJob({
    name: "payment.webhook.reconcile",
    payload: {
      rawBody: input.rawBody,
      signature: input.signature,
      ingestionId: ingestion.id,
      eventId,
    },
    idempotencyKey: idempotencyKeyFor(["razorpay-webhook", eventId]),
    priority: "critical",
    metadata: { provider: "razorpay", eventType: parsed.data.event },
  });

  const jobId = typeof job?.jobId === "string" ? job.jobId : null;
  await supabase.from("webhook_ingestions").update({ state: "QUEUED", async_job_id: jobId }).eq("id", ingestion.id);

  return { duplicate: false, ingestionId: ingestion.id, jobId, state: "QUEUED" };
}
