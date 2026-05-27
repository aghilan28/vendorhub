import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationPreferenceKey =
  | "orderUpdates"
  | "deliveryUpdates"
  | "sellerAlerts"
  | "stockAlerts"
  | "promotions"
  | "adminAlerts";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface MobileState {
  isOnline: boolean;
  connectionLabel: string;
  isStandalone: boolean;
  installPromptReady: boolean;
  installDismissedAt?: string;
  notificationPermission: NotificationPermission | "unsupported";
  notificationPreferences: Record<NotificationPreferenceKey, boolean>;
  lastReconnectAt?: string;
  setOnline: (isOnline: boolean, options?: { announceReconnect?: boolean }) => void;
  setConnectionLabel: (connectionLabel: string) => void;
  setStandalone: (isStandalone: boolean) => void;
  setInstallPromptReady: (installPromptReady: boolean) => void;
  dismissInstallPrompt: () => void;
  setNotificationPermission: (permission: NotificationPermission | "unsupported") => void;
  setNotificationPreference: (key: NotificationPreferenceKey, enabled: boolean) => void;
}

export const deferredInstallPrompt: { current?: InstallPromptEvent } = {};

const defaultPreferences: Record<NotificationPreferenceKey, boolean> = {
  orderUpdates: true,
  deliveryUpdates: true,
  sellerAlerts: true,
  stockAlerts: true,
  promotions: false,
  adminAlerts: true,
};

export const useMobileStore = create<MobileState>()(
  persist(
    (set) => ({
      isOnline: true,
      connectionLabel: "online",
      isStandalone: false,
      installPromptReady: false,
      notificationPermission: "unsupported",
      notificationPreferences: defaultPreferences,
      setOnline: (isOnline, options) =>
        set({
          isOnline,
          lastReconnectAt: isOnline && options?.announceReconnect ? new Date().toISOString() : undefined,
        }),
      setConnectionLabel: (connectionLabel) => set({ connectionLabel }),
      setStandalone: (isStandalone) => set({ isStandalone }),
      setInstallPromptReady: (installPromptReady) => set({ installPromptReady }),
      dismissInstallPrompt: () => set({ installDismissedAt: new Date().toISOString(), installPromptReady: false }),
      setNotificationPermission: (notificationPermission) => set({ notificationPermission }),
      setNotificationPreference: (key, enabled) =>
        set((state) => ({
          notificationPreferences: { ...state.notificationPreferences, [key]: enabled },
        })),
    }),
    {
      name: "vendorhub-mobile-v14",
      partialize: (state) => ({
        installDismissedAt: state.installDismissedAt,
        notificationPreferences: state.notificationPreferences,
      }),
    },
  ),
);
