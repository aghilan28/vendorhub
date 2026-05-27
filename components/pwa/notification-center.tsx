"use client";

import { Bell, BellOff, PackageCheck, ShieldAlert, Store, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission } from "@/lib/pwa/runtime";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";
import { NotificationPreferenceKey, useMobileStore } from "@/store/mobile-store";

const notificationOptions: Array<{
  key: NotificationPreferenceKey;
  icon: typeof Bell;
}> = [
  { key: "orderUpdates", icon: PackageCheck },
  { key: "deliveryUpdates", icon: Truck },
  { key: "sellerAlerts", icon: Store },
  { key: "adminAlerts", icon: ShieldAlert },
  { key: "stockAlerts", icon: Bell },
  { key: "promotions", icon: BellOff },
];

const optionCopy = {
  en: {
    orderUpdates: ["Order updates", "Payment, confirmation, cancellation, and refund movement."],
    deliveryUpdates: ["Delivery updates", "Dispatch, ETA, out-for-delivery, and delivered alerts."],
    sellerAlerts: ["Seller alerts", "New orders, SLA risk, low-stock, and fulfillment actions."],
    adminAlerts: ["Admin alerts", "Moderation queues, KYC reviews, and operational risk."],
    stockAlerts: ["Stock alerts", "Wishlist and local restock notifications."],
    promotions: ["Promotions", "Useful local offers only. Disabled by default."],
  },
  ta: {
    orderUpdates: ["ஆர்டர் புதுப்பிப்பு", "கட்டணம், உறுதி, ரத்து, refund நிலை."],
    deliveryUpdates: ["டெலிவரி புதுப்பிப்பு", "Dispatch, ETA, out-for-delivery, delivered alerts."],
    sellerAlerts: ["விற்பனையாளர் அறிவிப்பு", "புதிய order, SLA risk, குறைந்த stock, fulfillment actions."],
    adminAlerts: ["நிர்வாக அறிவிப்பு", "Moderation, KYC review, operational risk."],
    stockAlerts: ["ஸ்டாக் அறிவிப்பு", "Wishlist மற்றும் local restock updates."],
    promotions: ["சலுகைகள்", "பயனுள்ள local offers மட்டும். இயல்பாக off."],
  },
  hi: {
    orderUpdates: ["Order update", "Payment, confirmation, cancellation, और refund status."],
    deliveryUpdates: ["Delivery update", "Dispatch, ETA, out-for-delivery, और delivered alerts."],
    sellerAlerts: ["Seller alert", "New orders, SLA risk, low-stock, और fulfillment actions."],
    adminAlerts: ["Admin alert", "Moderation queues, KYC reviews, और operational risk."],
    stockAlerts: ["Stock alert", "Wishlist और local restock notifications."],
    promotions: ["Promotions", "Useful local offers only. Default off."],
  },
} as const;

export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const permission = useMobileStore((state) => state.notificationPermission);
  const preferences = useMobileStore((state) => state.notificationPreferences);
  const setPreference = useMobileStore((state) => state.setNotificationPreference);

  return (
    <section className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", compact && "p-3")}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-brand">
          <Bell className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary-text">{t("common.language")} commerce notifications</p>
          <p className="mt-1 text-sm text-secondary-text">
            {permission === "granted"
              ? "Enabled for useful commerce updates."
              : permission === "denied"
                ? "Blocked in browser settings. VendorHub will keep in-app alerts visible."
                : "Enable contextual buyer, seller, and admin alerts."}
          </p>
        </div>
        {permission !== "granted" && permission !== "denied" ? (
          <Button size="sm" onClick={() => void requestNotificationPermission()}>
            <Bell /> Enable
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {notificationOptions.map((item) => {
          const Icon = item.icon;
          const [label, detail] = optionCopy[locale][item.key];
          return (
            <label key={item.key} className="flex min-h-16 items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-emerald-600"
                checked={preferences[item.key]}
                onChange={(event) => setPreference(item.key, event.target.checked)}
              />
              <Icon className="mt-0.5 size-4 shrink-0 text-secondary-text" />
              <span>
                <span className="block font-medium text-primary-text">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-secondary-text">{detail}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
