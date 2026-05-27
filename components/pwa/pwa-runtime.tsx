"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { setupPwaRuntime } from "@/lib/pwa/runtime";

export function PwaRuntime() {
  const queryClient = useQueryClient();

  useEffect(() => setupPwaRuntime(queryClient), [queryClient]);

  return null;
}
