import {
  BadgeCheck,
  BellRing,
  ClipboardCheck,
  CreditCard,
  Gauge,
  PackagePlus,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Store,
} from "lucide-react";

export const demoFlowSteps = [
  {
    title: "Buyer discovery",
    route: "/home",
    timing: "0:00-0:30",
    icon: Store,
    proof: "Show local categories, verified vendors, recommendations, and popular nearby stock.",
  },
  {
    title: "Search wow moment",
    route: "/search?q=hedphones",
    timing: "0:30-1:00",
    icon: SearchCheck,
    proof: "Typo-tolerant search corrects hedphones and ranks wireless headphones first.",
  },
  {
    title: "Contextual search",
    route: "/search?q=comfortable%20office%20chair",
    timing: "1:00-1:20",
    icon: Gauge,
    proof: "Natural-language need maps to an ergonomic office chair, not just keyword hits.",
  },
  {
    title: "Product trust",
    route: "/product/soundnest-wireless-headphones",
    timing: "1:20-1:45",
    icon: BadgeCheck,
    proof: "PDP shows seller trust, stock, delivery promise, and similar products.",
  },
  {
    title: "Checkout simulation",
    route: "/cart",
    timing: "1:45-2:20",
    icon: ShoppingCart,
    proof: "Cart and checkout preserve payment, inventory, and delivery confidence.",
  },
  {
    title: "Payment and order state",
    route: "/checkout",
    timing: "2:20-2:45",
    icon: CreditCard,
    proof: "Sandbox payment and order creation feed live transaction surfaces.",
  },
  {
    title: "Realtime tracking",
    route: "/tracking",
    timing: "2:45-3:10",
    icon: BellRing,
    proof: "Tracking reflects live-state infrastructure and operational events.",
  },
  {
    title: "Seller operations",
    route: "/seller/products",
    timing: "3:10-3:45",
    icon: PackagePlus,
    proof: "Seller listing intelligence provides quality scoring and search guidance.",
  },
  {
    title: "Fulfillment dashboard",
    route: "/seller/dashboard",
    timing: "3:45-4:15",
    icon: ClipboardCheck,
    proof: "Seller dashboard feels active with fulfillment queue, inventory alerts, and realtime stream.",
  },
  {
    title: "Admin governance",
    route: "/admin/dashboard",
    timing: "4:15-5:00",
    icon: ShieldCheck,
    proof: "Admin sees marketplace intelligence, governance queues, moderation, and operational health.",
  },
];

export const demoReadinessSignals = [
  "50+ seeded products",
  "10 verified vendors",
  "Semantic and fuzzy search fallback",
  "Realtime local mode",
  "Seller listing guidance",
  "Admin intelligence overview",
];

export const launchCertificationChecks = [
  { label: "Production build", state: "Certified", detail: "Next.js build, lint, and typecheck are expected release gates." },
  { label: "Environment safety", state: "Demo-safe", detail: "Missing Supabase/OpenAI/Razorpay credentials degrade to local fallback data." },
  { label: "Search recovery", state: "Certified", detail: "Semantic retrieval falls back to fuzzy and keyword ranking." },
  { label: "Realtime recovery", state: "Certified", detail: "Realtime provider falls back to local live mode when Supabase is unavailable." },
  { label: "Payment recovery", state: "Certified", detail: "Sandbox payment failures preserve cart/order state and expose retry flows." },
  { label: "Route recovery", state: "Certified", detail: "Global and route-level error boundaries keep users out of dead ends." },
];
