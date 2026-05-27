import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  appendNotification: (notification: Notification) => void;
  markRead: (notificationId: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  appendNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications.filter((item) => item.id !== notification.id)].slice(0, 30),
    })),
  markRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, readAt: new Date().toISOString() } : notification,
      ),
    })),
}));
