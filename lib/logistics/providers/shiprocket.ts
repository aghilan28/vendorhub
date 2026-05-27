import "server-only";

import { env } from "@/lib/env";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: { token: string; expiresAt: number } | null = null;

type ShiprocketOrderItem = {
  product_name: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

type ShiprocketOrder = {
  id: string;
  created_at: string;
  buyer_name: string;
  delivery_address_line1: string;
  delivery_city: string;
  delivery_pincode: string;
  delivery_state: string;
  buyer_phone: string;
  items?: ShiprocketOrderItem[];
  payment_mode?: string;
  subtotal: number;
  weight?: number;
};

type ShiprocketVendor = {
  store_name?: string;
  name?: string;
};

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  if (!env.futureIntegrations.shiprocketEmail || !env.futureIntegrations.shiprocketPassword) {
    throw new Error("Shiprocket credentials are not configured; use self-delivery mode.");
  }

  const response = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.futureIntegrations.shiprocketEmail,
      password: env.futureIntegrations.shiprocketPassword,
    }),
  });

  if (!response.ok) throw new Error(`Shiprocket auth failed with ${response.status}`);
  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error("Shiprocket auth response did not include token.");
  cachedToken = { token: data.token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return data.token;
}

export async function createShipment(order: ShiprocketOrder, vendor: ShiprocketVendor): Promise<{ awb: string; shipment_id: string }> {
  const token = await getToken();
  const response = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: order.id,
      order_date: order.created_at,
      pickup_location: vendor.store_name ?? vendor.name,
      channel_id: env.futureIntegrations.shiprocketChannelId,
      billing_customer_name: order.buyer_name,
      billing_address: order.delivery_address_line1,
      billing_city: order.delivery_city,
      billing_pincode: order.delivery_pincode,
      billing_state: order.delivery_state,
      billing_country: "India",
      billing_phone: order.buyer_phone,
      shipping_is_billing: true,
      order_items: (order.items ?? []).map((item) => ({
        name: item.product_name,
        sku: item.product_id,
        units: item.quantity,
        selling_price: item.unit_price,
      })),
      payment_method: order.payment_mode === "cod" ? "COD" : "Prepaid",
      sub_total: order.subtotal,
      weight: order.weight ?? 0.5,
    }),
  });

  if (!response.ok) throw new Error(`Shiprocket shipment failed with ${response.status}`);
  const data = await response.json();
  return { awb: data.payload?.awb_code, shipment_id: String(data.payload?.shipment_id ?? "") };
}

export async function trackShipment(awb: string): Promise<{ status: string; note: string; raw: unknown }> {
  const token = await getToken();
  const response = await fetch(`${SHIPROCKET_BASE}/courier/track/awb/${awb}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`Shiprocket tracking failed with ${response.status}`);
  const data = await response.json();
  const shipmentStatus = String(data.tracking_data?.shipment_track?.[0]?.current_status ?? data.current_status ?? "in_transit").toLowerCase();
  const status = shipmentStatus.includes("delivered") ? "delivered" : shipmentStatus.includes("return") ? "returned" : shipmentStatus.includes("cancel") ? "cancelled" : "in_transit";
  return { status, note: `Shiprocket status: ${shipmentStatus}`, raw: data };
}
