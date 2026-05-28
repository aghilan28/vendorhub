import type { Delivery, DeliveryPartner } from "./types";

export const deliveryPartners: DeliveryPartner[] = [
  { id: "partner-self", name: "Seller self-delivery", mode: "seller_self", serviceLevel: "hyperlocal", rating: 0, integrationStatus: "manual" },
  { id: "partner-shiprocket", name: "Shiprocket", mode: "shiprocket", serviceLevel: "same_day", rating: 0, integrationStatus: "placeholder" },
  { id: "partner-porter", name: "Porter local", mode: "porter", serviceLevel: "hyperlocal", rating: 0, integrationStatus: "placeholder" },
  { id: "partner-dunzo", name: "Dunzo task", mode: "dunzo", serviceLevel: "hyperlocal", rating: 0, integrationStatus: "placeholder" },
];

export const seedDeliveries: Delivery[] = [];
