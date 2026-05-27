const requiredPublicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const env = {
  ...requiredPublicEnv,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cronSecret: process.env.CRON_SECRET,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  sentryDsn: process.env.SENTRY_DSN,
  sentryOrg: process.env.SENTRY_ORG,
  sentryProject: process.env.SENTRY_PROJECT,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT,
  storage: {
    productImagesBucket: process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images",
    vendorAssetsBucket: process.env.NEXT_PUBLIC_SUPABASE_VENDOR_ASSETS_BUCKET ?? "vendor-assets",
    profileImagesBucket: process.env.NEXT_PUBLIC_SUPABASE_PROFILE_IMAGES_BUCKET ?? "profile-images",
  },
  futureIntegrations: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayPublicKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    razorpaySecret: process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_SECRET,
    paymentProviderSecretKey: process.env.PAYMENT_PROVIDER_SECRET_KEY,
    paymentWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET,
    shiprocketEmail: process.env.SHIPROCKET_EMAIL,
    shiprocketPassword: process.env.SHIPROCKET_PASSWORD,
    shiprocketChannelId: process.env.SHIPROCKET_CHANNEL_ID,
  },
} as const;

export const productionEnvChecklist = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", configured: Boolean(env.supabaseUrl), public: true, requiredFor: "Supabase browser and middleware clients" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", configured: Boolean(env.supabaseAnonKey), public: true, requiredFor: "Supabase browser and middleware clients" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", configured: Boolean(env.supabaseServiceRoleKey), public: false, requiredFor: "Server-side operational jobs only" },
  { key: "CRON_SECRET", configured: Boolean(env.cronSecret), public: false, requiredFor: "Authorized async worker and scheduled recovery execution" },
  { key: "OPENAI_API_KEY", configured: Boolean(env.futureIntegrations.openAiApiKey), public: false, requiredFor: "OpenAI embedding generation" },
  { key: "RAZORPAY_KEY_ID", configured: Boolean(env.futureIntegrations.razorpayKeyId), public: false, requiredFor: "Payment provider initialization" },
  { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", configured: Boolean(env.futureIntegrations.razorpayPublicKeyId), public: true, requiredFor: "Razorpay checkout browser initialization" },
  { key: "RAZORPAY_KEY_SECRET", configured: Boolean(env.futureIntegrations.razorpaySecret), public: false, requiredFor: "Payment provider server verification" },
  { key: "RAZORPAY_WEBHOOK_SECRET", configured: Boolean(env.futureIntegrations.paymentWebhookSecret), public: false, requiredFor: "Razorpay webhook signature verification" },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", configured: Boolean(env.vapidPublicKey), public: true, requiredFor: "Browser push subscription" },
  { key: "VAPID_PRIVATE_KEY", configured: Boolean(env.vapidPrivateKey), public: false, requiredFor: "Server-side push delivery" },
  { key: "VAPID_SUBJECT", configured: Boolean(env.vapidSubject), public: false, requiredFor: "Server-side push delivery" },
  { key: "SENTRY_DSN", configured: Boolean(env.sentryDsn), public: false, requiredFor: "External observability sink" },
] as const;

export function getEnvironmentReadiness() {
  const missingRequired = productionEnvChecklist.filter((item) => !item.configured && item.key.startsWith("NEXT_PUBLIC_"));

  return {
    mode: missingRequired.length ? "demo-safe" : "production-ready",
    missingRequired: missingRequired.map((item) => item.key),
    checks: productionEnvChecklist,
  };
}

export function assertSupabasePublicEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  };
}
