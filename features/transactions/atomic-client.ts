"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atomicCheckoutAction } from "@/lib/transactions/atomic-checkout";
import { useCheckoutStore } from "@/store/checkout-store";
import type { CheckoutInput } from "./types";

export function createCheckoutIdempotencyKey(seed = crypto.randomUUID()) {
  return `vh_checkout_${seed.replaceAll("-", "")}`;
}

export function useAtomicCheckoutMutation() {
  const queryClient = useQueryClient();
  const beginAtomicCheckout = useCheckoutStore((state) => state.beginAtomicCheckout);
  const confirmAtomicCheckout = useCheckoutStore((state) => state.confirmAtomicCheckout);
  const failAtomicCheckout = useCheckoutStore((state) => state.failAtomicCheckout);

  return useMutation({
    mutationKey: ["transactions", "atomic-checkout"],
    mutationFn: async (input: CheckoutInput) => {
      const idempotencyKey = input.idempotencyKey ?? createCheckoutIdempotencyKey();
      beginAtomicCheckout(idempotencyKey);
      return atomicCheckoutAction({
        idempotencyKey,
        deliveryAddress: input.address,
        paymentMethod: input.paymentMethod,
        metadata: {
          deliverySlot: input.deliverySlot,
          orderNote: input.orderNote,
        },
      });
    },
    onSuccess: (result) => {
      confirmAtomicCheckout(result);
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      failAtomicCheckout(error instanceof Error ? error.message : "Checkout could not be completed safely.");
    },
  });
}

export function useAtomicCheckoutProgress() {
  const progress = useCheckoutStore((state) => state.atomicProgress);

  return useQuery({
    queryKey: ["transactions", "atomic-progress", progress.idempotencyKey, progress.transactionId, progress.state],
    queryFn: async () => progress,
    initialData: progress,
    staleTime: 1_000,
  });
}
