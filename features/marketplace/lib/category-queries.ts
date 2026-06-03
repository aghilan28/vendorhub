import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import type { Category } from "@/types";

export function useLiveCategories() {
  return useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => {
      return fetchJson<Category[]>("/api/public/v1/categories");
    },
  });
}
