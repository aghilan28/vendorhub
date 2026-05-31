// MCP-0C — Customer Relationship (segments + value from real orders)

import type { CustomerSegment, CustomerSummary, SellerOperatingInput } from "./types";

interface Agg {
  name: string;
  orders: number;
  value: number;
}

export function computeCustomers(input: SellerOperatingInput): CustomerSummary {
  const byCustomer = new Map<string, Agg>();
  for (const order of input.orders) {
    const key = order.customer || "Guest";
    const agg = byCustomer.get(key) ?? { name: key, orders: 0, value: 0 };
    agg.orders += 1;
    agg.value += order.subtotal + order.deliveryFee;
    byCustomer.set(key, agg);
  }

  const customers = [...byCustomer.values()];
  const totalCustomers = customers.length;
  const repeat = customers.filter((c) => c.orders >= 2);
  const vipThreshold = 2000;

  const segmentOf = (c: Agg): CustomerSegment["segment"] => {
    if (c.value >= vipThreshold && c.orders >= 2) return "vip";
    if (c.orders >= 2) return "repeat";
    if (c.orders === 1) return "new";
    return "at_risk";
  };

  const segments: CustomerSegment[] = (["new", "repeat", "vip", "at_risk"] as const).map((segment) => {
    const members = customers.filter((c) => segmentOf(c) === segment);
    return { segment, count: members.length, revenue: Math.round(members.reduce((s, c) => s + c.value, 0)) };
  });

  return {
    totalCustomers,
    repeatRate: totalCustomers ? Math.round((repeat.length / totalCustomers) * 1000) / 10 : 0,
    segments,
    topCustomers: customers.sort((a, b) => b.value - a.value).slice(0, 8),
  };
}
