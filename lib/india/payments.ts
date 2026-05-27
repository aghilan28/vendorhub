export type UpiRecoveryState = "INTENT_READY" | "QR_FALLBACK" | "POLL_PROVIDER" | "RECONCILE_WEBHOOK" | "RETRY_SAFE" | "FAILED_RECOVERABLE";

export function decideUpiRecovery(input: {
  intentOpened: boolean;
  qrShown: boolean;
  webhookReceived: boolean;
  providerConfirmed: boolean;
  minutesSinceAttempt: number;
  networkOnline: boolean;
}) {
  if (input.providerConfirmed || input.webhookReceived) {
    return { state: "RECONCILE_WEBHOOK" as UpiRecoveryState, retryAllowed: false, message: "Payment confirmation is being reconciled server-side." };
  }
  if (!input.networkOnline) {
    return { state: "RETRY_SAFE" as UpiRecoveryState, retryAllowed: false, message: "Keep the order reserved and retry verification after reconnect." };
  }
  if (!input.intentOpened && !input.qrShown) {
    return { state: "INTENT_READY" as UpiRecoveryState, retryAllowed: true, message: "Open UPI intent or show QR fallback." };
  }
  if (input.minutesSinceAttempt >= 10) {
    return { state: "POLL_PROVIDER" as UpiRecoveryState, retryAllowed: true, message: "Poll provider status and keep checkout recoverable." };
  }
  if (input.intentOpened && !input.qrShown) {
    return { state: "QR_FALLBACK" as UpiRecoveryState, retryAllowed: true, message: "Show QR fallback if app handoff did not complete." };
  }
  return { state: "FAILED_RECOVERABLE" as UpiRecoveryState, retryAllowed: true, message: "Payment is not confirmed yet; retry without duplicating the order." };
}
