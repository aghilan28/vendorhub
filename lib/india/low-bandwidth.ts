export type ConnectionLabel = "offline" | "slow-2g" | "2g" | "3g" | "4g" | "data saver" | "online";

export function lowBandwidthPolicy(label: string, saveData = false) {
  const normalized = (saveData ? "data saver" : label || "online") as ConnectionLabel;
  const constrained = ["offline", "slow-2g", "2g", "3g", "data saver"].includes(normalized);

  return {
    label: normalized,
    constrained,
    deferImages: constrained,
    preferSkeletons: constrained,
    pauseRealtime: ["offline", "slow-2g", "2g", "data saver"].includes(normalized),
    checkoutCopy:
      normalized === "offline"
        ? "Checkout is paused offline; cart and payment recovery stay safe."
        : constrained
          ? "Low-network mode active; avoid refreshes while payment or checkout is in progress."
          : "Network is healthy for realtime checkout.",
  };
}
