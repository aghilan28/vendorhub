import { requireUser } from "@/lib/api/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listCurrentUserVendors() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  return supabase
    .from("vendor_members")
    .select("role, vendor:vendors(*)")
    .eq("user_id", user.id)
    .is("deleted_at", null);
}

export async function getVendorDashboardSnapshot(vendorId: string) {
  const supabase = await createSupabaseServerClient();

  const [orders, inventory, products] = await Promise.all([
    supabase.from("orders").select("id, status, total_amount").eq("vendor_id", vendorId).is("deleted_at", null),
    supabase.from("inventory").select("id, stock_status, stock_quantity, reserved_quantity").eq("vendor_id", vendorId).is("deleted_at", null),
    supabase.from("products").select("id, status").eq("vendor_id", vendorId).is("deleted_at", null),
  ]);

  return { orders, inventory, products };
}
