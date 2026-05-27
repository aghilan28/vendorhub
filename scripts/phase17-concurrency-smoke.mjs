import { createClient } from "@supabase/supabase-js";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PHASE17_BUYER_JWT"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for the Phase 17 concurrency smoke test.`);
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      Authorization: `Bearer ${process.env.PHASE17_BUYER_JWT}`,
    },
  },
});

const address = {
  label: "Concurrency Lab",
  recipient: "Phase 17 Buyer",
  phone: "+919999999999",
  line1: "Atomic Checkout Test Street",
  locality: "Indiranagar",
  city: "Bengaluru",
  pincode: "560038",
};

const attempts = Number(process.env.PHASE17_ATTEMPTS ?? 8);
const paymentMethod = process.env.PHASE17_PAYMENT_METHOD ?? "upi";

const results = await Promise.allSettled(
  Array.from({ length: attempts }, (_, index) =>
    supabase.rpc("atomic_checkout", {
      checkout_idempotency_key: `phase17_concurrency_${Date.now()}_${index}`,
      delivery_address: address,
      payment_method: paymentMethod,
      checkout_metadata: { smoke: true, attempt: index },
    }),
  ),
);

const summary = results.map((result, index) => {
  if (result.status === "rejected") {
    return { index, ok: false, error: result.reason?.message ?? "Rejected" };
  }

  if (result.value.error) {
    return { index, ok: false, error: result.value.error.message, code: result.value.error.code };
  }

  return {
    index,
    ok: true,
    transactionId: result.value.data?.transactionId,
    orderNumbers: result.value.data?.orderNumbers,
    state: result.value.data?.state,
  };
});

console.table(summary);

const successCount = summary.filter((item) => item.ok).length;
if (successCount > 1) {
  throw new Error(`Expected at most one successful checkout for a final-stock race, got ${successCount}.`);
}
