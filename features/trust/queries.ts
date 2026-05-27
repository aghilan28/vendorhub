"use client";

import { useQuery } from "@tanstack/react-query";
import { useTrustStore } from "@/store/trust-store";
import { getTrustSummary } from "./data";

const delay = async () => new Promise((resolve) => setTimeout(resolve, 90));

export function useKycProfiles() {
  const profiles = useTrustStore((state) => state.profiles);
  return useQuery({
    queryKey: ["trust", "kyc-profiles", profiles.map((profile) => `${profile.sellerId}:${profile.verificationState}:${profile.trustScore.score}`).join("|")],
    queryFn: async () => (await delay(), profiles),
    initialData: profiles,
  });
}

export function useKycProfile(sellerId: string) {
  const profiles = useTrustStore((state) => state.profiles);
  return useQuery({
    queryKey: ["trust", "kyc-profile", sellerId, profiles.find((profile) => profile.sellerId === sellerId)?.verificationState],
    queryFn: async () => (await delay(), profiles.find((profile) => profile.sellerId === sellerId)),
    initialData: profiles.find((profile) => profile.sellerId === sellerId),
  });
}

export function useVerificationQueue() {
  const profiles = useTrustStore((state) => state.profiles);
  return useQuery({
    queryKey: ["trust", "verification-queue", profiles.map((profile) => `${profile.sellerId}:${profile.verificationState}`).join("|")],
    queryFn: async () => (await delay(), profiles.filter((profile) => ["PENDING_REVIEW", "RESUBMISSION_REQUIRED", "REJECTED", "SUSPENDED"].includes(profile.verificationState))),
    initialData: profiles.filter((profile) => ["PENDING_REVIEW", "RESUBMISSION_REQUIRED", "REJECTED", "SUSPENDED"].includes(profile.verificationState)),
  });
}

export function useTrustSummary() {
  const profiles = useTrustStore((state) => state.profiles);
  return useQuery({
    queryKey: ["trust", "summary", profiles.map((profile) => `${profile.sellerId}:${profile.trustScore.score}`).join("|")],
    queryFn: async () => (await delay(), getTrustSummary(profiles)),
    initialData: getTrustSummary(profiles),
  });
}
