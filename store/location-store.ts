"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chennaiLocationPresets, defaultBuyerLocation } from "@/lib/geo/locations";
import type { BuyerLocation } from "@/types";

type LocationPermissionState = "idle" | "requesting" | "granted" | "denied" | "failed";

interface LocationState {
  currentLocation: BuyerLocation;
  savedLocations: BuyerLocation[];
  radiusKm: number;
  nearbyOnly: boolean;
  permissionState: LocationPermissionState;
  error?: string;
  setLocation: (location: BuyerLocation) => void;
  setRadius: (radiusKm: number) => void;
  setNearbyOnly: (nearbyOnly: boolean) => void;
  requestBrowserLocation: () => Promise<void>;
  setManualLocation: (locationId: string) => void;
  clearError: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      currentLocation: defaultBuyerLocation,
      savedLocations: chennaiLocationPresets,
      radiusKm: 6,
      nearbyOnly: false,
      permissionState: "idle",
      setLocation: (location) =>
        set((state) => ({
          currentLocation: location,
          savedLocations: [location, ...state.savedLocations.filter((item) => item.id !== location.id)].slice(0, 6),
          permissionState: location.source === "gps" ? "granted" : state.permissionState,
          error: undefined,
        })),
      setRadius: (radiusKm) => set({ radiusKm }),
      setNearbyOnly: (nearbyOnly) => set({ nearbyOnly }),
      requestBrowserLocation: async () => {
        if (!("geolocation" in navigator)) {
          set({ permissionState: "failed", error: "This browser cannot detect GPS location. Choose an area manually." });
          return;
        }
        set({ permissionState: "requesting", error: undefined });
        navigator.geolocation.getCurrentPosition(
          (position) => {
            get().setLocation({
              id: "loc-gps-current",
              label: "Current location",
              source: "gps",
              latitude: Number(position.coords.latitude.toFixed(7)),
              longitude: Number(position.coords.longitude.toFixed(7)),
              locality: "Detected area",
              city: "Chennai",
              accuracyMeters: Math.round(position.coords.accuracy),
            });
          },
          (error) => {
            set({
              permissionState: error.code === error.PERMISSION_DENIED ? "denied" : "failed",
              error: error.code === error.PERMISSION_DENIED ? "Location permission was denied. You can still choose an area manually." : "GPS detection timed out. Choose an area manually.",
            });
          },
          { enableHighAccuracy: true, timeout: 9000, maximumAge: 300000 },
        );
      },
      setManualLocation: (locationId) => {
        const location = chennaiLocationPresets.find((item) => item.id === locationId);
        if (location) get().setLocation({ ...location, source: location.source === "default" ? "manual" : location.source });
      },
      clearError: () => set({ error: undefined }),
    }),
    { name: "vendorhub-location-state", partialize: ({ currentLocation, savedLocations, radiusKm, nearbyOnly }) => ({ currentLocation, savedLocations, radiusKm, nearbyOnly }) },
  ),
);
