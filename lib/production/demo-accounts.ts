export const demoAccounts = [
  {
    role: "Buyer",
    name: "Ananya Rao",
    email: "ananya.buyer@vendorhub.local",
    route: "/home",
    promise: "Search, cart, checkout, order tracking, and payment recovery are pre-seeded.",
  },
  {
    role: "Seller",
    name: "Akash Kumar",
    email: "akash.seller@vendorhub.local",
    route: "/seller/dashboard",
    promise: "Fulfillment queue, product catalog, inventory, and listing intelligence stay populated.",
  },
  {
    role: "Admin",
    name: "Meera Iyer",
    email: "meera.admin@vendorhub.local",
    route: "/admin/dashboard",
    promise: "Governance, moderation, search health, and marketplace intelligence are demo-safe.",
  },
] as const;
