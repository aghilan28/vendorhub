export interface ApiEnvelope<T> {
  data: T;
  correlationId: string;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  correlationId: string;
}

export type QueryPage = {
  page?: number;
  pageSize?: number;
};

export function getPaginationRange({ page = 1, pageSize = 24 }: QueryPage) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;

  return {
    from,
    to: from + safePageSize - 1,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(error?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createMutationRequest<TInput, TOutput>(path: string, method: "POST" | "PATCH" | "DELETE") {
  return (input: TInput) =>
    fetchJson<TOutput>(path, {
      method,
      body: JSON.stringify(input),
    });
}
