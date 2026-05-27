import "server-only";

import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { recordOperationalEvent } from "@/lib/production/observability";

type PushSubscriptionRow = {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
};

type UnsafeSupabase = ReturnType<typeof createSupabaseAdminClient> & {
  from: (relation: string) => {
    select: (columns: string) => { eq: (column: string, value: string) => Promise<{ data: unknown[] | null; error: Error | null }> };
    delete: () => { eq: (column: string, value: string) => Promise<{ error: Error | null }> };
  };
};

function configureWebPush() {
  if (!env.vapidPublicKey || !env.vapidPrivateKey || !env.vapidSubject) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  return true;
}

async function getSubscriptionsForUser(userId: string) {
  const supabase = createSupabaseAdminClient() as UnsafeSupabase;
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh_key,auth_key")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as unknown as PushSubscriptionRow[];
}

async function deleteSubscription(endpoint: string) {
  const supabase = createSupabaseAdminClient() as UnsafeSupabase;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function sendPushToUser(userId: string, notification: { title: string; body: string; url: string }) {
  if (!configureWebPush()) {
    recordOperationalEvent("warn", "push.skipped_missing_vapid", { userId }, { domain: "system", subjectId: userId });
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await getSubscriptionsForUser(userId);
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key } },
        JSON.stringify(notification),
      ),
    ),
  );

  await Promise.all(
    results.map((result, index) => {
      if (result.status === "rejected" && result.reason?.statusCode === 410) {
        return deleteSubscription(subscriptions[index].endpoint);
      }
      return Promise.resolve();
    }),
  );

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;
  recordOperationalEvent(failed ? "warn" : "info", "push.delivery.completed", { userId, sent, failed }, { domain: "system", subjectId: userId });
  return { sent, failed, skipped: false };
}
