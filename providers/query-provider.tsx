"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { queryCachePolicy } from "@/lib/performance/cache-policy";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: queryCachePolicy.marketplace.staleTime,
            gcTime: queryCachePolicy.marketplace.gcTime,
            refetchOnWindowFocus: false,
            refetchOnReconnect: "always",
            networkMode: "offlineFirst",
            retry: 2,
            retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 5_000),
            structuralSharing: true,
          },
          mutations: {
            networkMode: "online",
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
