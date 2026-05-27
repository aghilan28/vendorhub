import { refreshProductEmbedding, refreshStaleProductEmbeddings } from "@/lib/ai/embedding-sync";
import { runGovernanceFraudDetectionSystem, runGovernanceModerationRecoverySystem } from "@/lib/governance/recovery";
import { runLocalizationQualityAudit, runUpiRecoveryAssessment } from "@/lib/india/operations";
import { runCongestionAnalysisSystem, runDispatchIntelligenceSystem, runDynamicSlaEnforcementSystem, runProviderFailoverSystem, runRoutingRefreshSystem } from "@/lib/logistics/live-operations";
import { refreshDeliveryEtaSystem, runDeliveryReconciliationSystem, runDeliverySlaDetectionSystem } from "@/lib/logistics/reconciliation";
import { recordOperationalEvent } from "@/lib/production/observability";
import { runFinancialReconciliationSystem, reconcileRazorpayWebhookSystem } from "@/lib/transactions/payment-reconciliation";
import { sendPushToUser } from "@/lib/push/sender";
import { domainForAsyncCategory } from "./observability-domain";
import { idempotencyKeyFor, persistDurableEvent } from "./orchestrator";
import { createAsyncSupabaseClient } from "./supabase-unsafe";
import type { AsyncJobRow, AsyncWorkerResult } from "./types";

type PayloadRecord = Record<string, unknown>;

function payloadOf(job: AsyncJobRow) {
  return (typeof job.payload === "object" && job.payload !== null ? job.payload : {}) as PayloadRecord;
}

function requiredString(payload: PayloadRecord, key: string) {
  const value = payload[key];
  if (typeof value !== "string" || !value.length) throw new Error(`Missing ${key}`);
  return value;
}

function optionalString(payload: PayloadRecord, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function optionalNumber(payload: PayloadRecord, key: string, fallback: number) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function runAsyncJobHandler(job: AsyncJobRow): Promise<AsyncWorkerResult> {
  const payload = payloadOf(job);

  switch (job.job_name) {
    case "payment.webhook.reconcile": {
      const ingestionId = optionalString(payload, "ingestionId");
      const supabase = createAsyncSupabaseClient();
      if (ingestionId) {
        await supabase.from("webhook_ingestions").update({ state: "PROCESSING", attempts: job.attempts, last_error: null } as never).eq("id", ingestionId);
      }
      try {
        const result = await reconcileRazorpayWebhookSystem(requiredString(payload, "rawBody"), optionalString(payload, "signature"));
        if (ingestionId) {
          await supabase.from("webhook_ingestions").update({ state: "PROCESSED", processed_at: new Date().toISOString(), last_error: null } as never).eq("id", ingestionId);
        }
        await persistDurableEvent({
          source: "vendorhub.async",
          eventKey: idempotencyKeyFor(["payment.webhook.reconciled", job.id]),
          eventType: "payment.webhook.reconciled",
          payload: { jobId: job.id, result: result as never },
          subjectType: "async_job",
          subjectId: job.id,
        });
        return { ok: true, metadata: { result: "[object]" } };
      } catch (error) {
        if (ingestionId) {
          await supabase
            .from("webhook_ingestions")
            .update({
              state: job.attempts >= job.max_attempts ? "DEAD_LETTER" : "FAILED",
              attempts: job.attempts,
              last_error: error instanceof Error ? error.message : "Webhook reconciliation failed.",
            } as never)
            .eq("id", ingestionId);
        }
        throw error;
      }
    }

    case "payment.reconciliation.run": {
      const result = await runFinancialReconciliationSystem(optionalNumber(payload, "batchSize", 100));
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.eta.refresh": {
      const deliveryId = requiredString(payload, "deliveryId");
      const result = await refreshDeliveryEtaSystem(
        deliveryId,
        optionalNumber(payload, "etaMinutes", 30),
        optionalString(payload, "confidence") ?? "MEDIUM",
        optionalString(payload, "reason") ?? "Async ETA refresh.",
      );
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.dispatch.recalculate": {
      const result = await runDispatchIntelligenceSystem(optionalNumber(payload, "batchSize", 100), optionalString(payload, "zoneId"));
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.reconciliation.run": {
      const result = await runDeliveryReconciliationSystem(optionalNumber(payload, "batchSize", 100));
      await runDeliverySlaDetectionSystem();
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.failed.recover": {
      const result = await runDeliveryReconciliationSystem(optionalNumber(payload, "batchSize", 50));
      return { ok: true, metadata: { result: result as never, recovery: true } };
    }

    case "delivery.provider.failover": {
      const result = await runProviderFailoverSystem(optionalString(payload, "provider"), optionalString(payload, "reason") ?? "provider_health_recheck");
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.routing.refresh": {
      const result = await runRoutingRefreshSystem(optionalString(payload, "zoneId"), optionalNumber(payload, "batchSize", 100));
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.sla.recalculate": {
      const result = await runDynamicSlaEnforcementSystem(optionalNumber(payload, "batchSize", 100));
      return { ok: true, metadata: { result: result as never } };
    }

    case "delivery.congestion.analyze": {
      const result = await runCongestionAnalysisSystem(optionalString(payload, "zoneId"));
      return { ok: true, metadata: { result: result as never } };
    }


    case "ai.embedding.refresh": {
      const result = await refreshProductEmbedding(requiredString(payload, "productId"));
      return { ok: true, metadata: { result: result as never } };
    }

    case "ai.embedding.refresh_stale": {
      const result = await refreshStaleProductEmbeddings(optionalNumber(payload, "limit", 20));
      return { ok: true, metadata: { result: result as never } };
    }

    case "governance.fraud.scan": {
      const result = await runGovernanceFraudDetectionSystem(optionalNumber(payload, "batchSize", 100));
      await persistDurableEvent({
        source: "vendorhub.async",
        eventKey: idempotencyKeyFor(["governance.fraud.scan.completed", job.id]),
        eventType: "governance.fraud.scan.completed",
        payload: { jobId: job.id, result: result as never },
        subjectType: "async_job",
        subjectId: job.id,
      });
      return { ok: true, metadata: { result: result as never } };
    }

    case "governance.moderation.scan": {
      const result = await runGovernanceModerationRecoverySystem(optionalNumber(payload, "batchSize", 100));
      await persistDurableEvent({
        source: "vendorhub.async",
        eventKey: idempotencyKeyFor(["governance.moderation.scan.completed", job.id]),
        eventType: "governance.moderation.scan.completed",
        payload: { jobId: job.id, result: result as never },
        subjectType: "async_job",
        subjectId: job.id,
      });
      return { ok: true, metadata: { result: result as never } };
    }

    case "india.upi.recover": {
      const result = runUpiRecoveryAssessment({
        intentOpened: Boolean(payload.intentOpened),
        qrShown: Boolean(payload.qrShown),
        webhookReceived: Boolean(payload.webhookReceived),
        providerConfirmed: Boolean(payload.providerConfirmed),
        minutesSinceAttempt: optionalNumber(payload, "minutesSinceAttempt", 0),
        networkOnline: payload.networkOnline !== false,
      });
      await persistDurableEvent({
        source: "vendorhub.async",
        eventKey: idempotencyKeyFor(["india.upi.recover.completed", job.id]),
        eventType: "india.upi.recover.completed",
        payload: { jobId: job.id, result },
        subjectType: "async_job",
        subjectId: job.id,
      });
      return { ok: true, metadata: { result } };
    }

    case "localization.audit": {
      const result = runLocalizationQualityAudit();
      return { ok: true, metadata: { healthy: result.healthy, fallbackLocales: result.fallbackRequired.map((item) => item.locale).join(",") } };
    }

    case "payment.refund.sync":
    case "payment.payout.verify":
    case "notification.dispatch":
    case "notification.email.deliver":
    case "notification.sms.placeholder":
    case "notification.digest.batch":
    case "analytics.seller.aggregate":
    case "analytics.forecast.run":
    case "analytics.operational.metrics":
    case "analytics.admin.refresh":
    case "ai.semantic.index":
    case "ai.recommendations.recalculate":
    case "ai.ranking.recalculate":
    case "ai.diagnostics.run":
    case "governance.trust.recalculate":
    case "governance.dispute.analyze":
    case "realtime.invalidation.flush": {
      recordOperationalEvent("info", "async.job.placeholder_completed", {
        jobName: job.job_name,
        jobId: job.id,
      }, { domain: domainForAsyncCategory(job.category), subjectId: job.id });
      return { ok: true, metadata: { placeholder: true } };
    }

    case "notification.push.deliver": {
      const userId = requiredString(payload, "userId");
      const result = await sendPushToUser(userId, {
        title: optionalString(payload, "title") ?? "VendorHub update",
        body: optionalString(payload, "body") ?? "You have a new notification.",
        url: optionalString(payload, "url") ?? "/notifications",
      });
      return { ok: true, metadata: { sent: result.sent, failed: result.failed, skipped: result.skipped } };
    }

    default:
      return { ok: false, poison: true, metadata: { reason: "unknown_job_name" } };
  }
}
