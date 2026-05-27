import { getPaginationRange, type QueryPage } from "@/lib/api/client";
import { requireUser } from "@/lib/api/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listBuyerOrders(input: QueryPage = {}) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { from, to } = getPaginationRange(input);

  return supabase
    .from("orders")
    .select("*, vendor:vendors(id, name, slug), items:order_items(*)", { count: "exact" })
    .eq("buyer_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);
}

export async function listVendorOrders(vendorId: string, input: QueryPage = {}) {
  const supabase = await createSupabaseServerClient();
  const { from, to } = getPaginationRange(input);

  return supabase
    .from("orders")
    .select("*, buyer:profiles(id, full_name, email), items:order_items(*)", { count: "exact" })
    .eq("vendor_id", vendorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);
}
