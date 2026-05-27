export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  buyer: {
    home: ["buyer", "home"] as const,
    search: (query: string) => ["buyer", "search", query] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (slug: string) => ["products", "detail", slug] as const,
  },
  cart: {
    current: ["cart", "current"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  analytics: {
    seller: ["analytics", "seller"] as const,
    admin: ["analytics", "admin"] as const,
  },
} as const;
