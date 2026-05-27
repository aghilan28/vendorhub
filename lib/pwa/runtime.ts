"use client";

import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { deferredInstallPrompt, useMobileStore } from "@/store/mobile-store";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

export function setupPwaRuntime(queryClient: QueryClient) {
  if (typeof window === "undefined") return () => undefined;

  const store = useMobileStore.getState();
  const media = window.matchMedia("(display-mode: standalone)");
  const connection = getConnection();

  const updateNetwork = () => {
    const isOnline = navigator.onLine;
    useMobileStore.getState().setOnline(isOnline);
    useMobileStore.getState().setConnectionLabel(getConnectionLabel(connection));
    onlineManager.setOnline(isOnline);
    if (isOnline) {
      queryClient.resumePausedMutations().catch(() => undefined);
      queryClient.invalidateQueries({ stale: true }).catch(() => undefined);
    }
  };

  const updateStandalone = () => {
    const navigatorStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    useMobileStore.getState().setStandalone(media.matches || navigatorStandalone);
  };

  const beforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt.current = event as typeof deferredInstallPrompt.current;
    useMobileStore.getState().setInstallPromptReady(true);
  };

  const installed = () => {
    deferredInstallPrompt.current = undefined;
    useMobileStore.getState().setInstallPromptReady(false);
    useMobileStore.getState().setStandalone(true);
  };

  store.setNotificationPermission(readNotificationPermission());
  updateNetwork();
  updateStandalone();
  registerServiceWorker();

  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
  window.addEventListener("appinstalled", installed);
  media.addEventListener("change", updateStandalone);
  connection?.addEventListener?.("change", updateNetwork);

  return () => {
    window.removeEventListener("online", updateNetwork);
    window.removeEventListener("offline", updateNetwork);
    window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    window.removeEventListener("appinstalled", installed);
    media.removeEventListener("change", updateStandalone);
    connection?.removeEventListener?.("change", updateNetwork);
  };
}

export async function triggerInstallPrompt() {
  const prompt = deferredInstallPrompt.current;
  if (!prompt) {
    useMobileStore.getState().dismissInstallPrompt();
    return "unavailable" as const;
  }

  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredInstallPrompt.current = undefined;
  useMobileStore.getState().setInstallPromptReady(false);
  if (choice.outcome === "dismissed") useMobileStore.getState().dismissInstallPrompt();
  return choice.outcome;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    useMobileStore.getState().setNotificationPermission("unsupported");
    return "unsupported" as const;
  }

  const permission = await Notification.requestPermission();
  useMobileStore.getState().setNotificationPermission(permission);
  if (permission === "granted") {
    await subscribeBrowserPush().catch(() => undefined);
  }
  return permission;
}

async function subscribeBrowserPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || process.env.NODE_ENV === "development") return;

  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((registration) => {
      registration.update().catch(() => undefined);
      if (readNotificationPermission() === "granted") {
        subscribeBrowserPush().catch(() => undefined);
      }
    })
    .catch(() => undefined);
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation; mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation }).connection;
}

function getConnectionLabel(connection?: NetworkInformation) {
  if (!navigator.onLine) return "offline";
  if (connection?.saveData) return "data saver";
  return connection?.effectiveType ?? "online";
}
