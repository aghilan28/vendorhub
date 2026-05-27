import { Sidebar, type SidebarItem } from "@/components/layout/sidebar";

export function DashboardSidebar({ items, title }: { items: readonly SidebarItem[]; title: string }) {
  return <Sidebar items={items} title={title} />;
}
