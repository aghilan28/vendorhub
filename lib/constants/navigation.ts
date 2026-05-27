import {
  BarChart3,
  Boxes,
  ClipboardList,
  Bell,
  CircleHelp,
  Heart,
  Home,
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  User,
  Users,
  WalletCards,
  BellRing,
  FileClock,
  Flag,
  HeartPulse,
  PackageCheck,
} from "lucide-react";

export const buyerNavigation = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Orders", href: "/orders", icon: ReceiptText },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Profile", href: "/profile", icon: User },
] as const;

export const sellerNavigation = [
  { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/seller/products", icon: PackageSearch },
  { label: "Inventory", href: "/seller/inventory", icon: Boxes },
  { label: "Orders", href: "/seller/orders", icon: ClipboardList },
  { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
  { label: "Store settings", href: "/seller/store-settings", icon: Settings2 },
  { label: "Notifications", href: "/seller/notifications", icon: Bell },
  { label: "Payouts", href: "/seller/payouts-placeholder", icon: WalletCards },
  { label: "Support", href: "/seller/support-placeholder", icon: CircleHelp },
] as const;

export const adminNavigation = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Vendors", href: "/admin/vendors", icon: Users },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldCheck },
  { label: "Orders", href: "/admin/orders", icon: PackageCheck },
  { label: "Refunds", href: "/admin/refunds", icon: WalletCards },
  { label: "Categories", href: "/admin/categories", icon: ListChecks },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/admin/notifications", icon: BellRing },
  { label: "Flags", href: "/admin/flags", icon: Flag },
  { label: "Audit logs", href: "/admin/audit-logs", icon: FileClock },
  { label: "Platform health", href: "/admin/platform-health-placeholder", icon: HeartPulse },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
] as const;

export const buyerQuickActions = [
  { label: "Cart", href: "/cart", icon: ShoppingCart },
  { label: "Tracking", href: "/tracking", icon: Truck },
] as const;
