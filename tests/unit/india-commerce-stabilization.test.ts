import { describe, expect, it } from "vitest";
import { checkCodEligibility } from "@/features/commerce-finance/cod";
import { scoreCodRisk } from "@/lib/india/cod-risk";
import { lowBandwidthPolicy } from "@/lib/india/low-bandwidth";
import { decideUpiRecovery } from "@/lib/india/payments";
import { normalizeVernacularQuery } from "@/lib/india/vernacular";
import { formatIndianAddress, formatIndianPhone, formatLocalizedCurrency } from "@/lib/i18n/format";
import { safeLocalizedText, validateLocaleCatalog } from "@/lib/i18n/governance";
import { messages } from "@/lib/i18n/messages";
import { createCartItem } from "../utils/fixtures";

describe("stabilization s4 india commerce", () => {
  it("normalizes vernacular and transliterated discovery queries", () => {
    expect(normalizeVernacularQuery("tamatar", "hi").expansions).toContain("tomato");
    expect(normalizeVernacularQuery("தக்காளி", "ta").expansions).toContain("tomato");
    expect(normalizeVernacularQuery("कुर्सी", "hi").expansions).toContain("office chair");
  });

  it("detects localization quality gaps and falls back safely", () => {
    const audit = validateLocaleCatalog(messages);
    expect(audit.find((item) => item.locale === "en")?.completeness).toBe(100);
    expect(safeLocalizedText({ value: "????????", fallback: "Search", locale: "ta" })).toMatchObject({
      text: "Search",
      fallbackUsed: true,
      reason: "suspicious_encoding",
    });
  });

  it("keeps UPI delayed confirmation recoverable", () => {
    expect(decideUpiRecovery({ intentOpened: true, qrShown: false, webhookReceived: false, providerConfirmed: false, minutesSinceAttempt: 3, networkOnline: true }).state).toBe("QR_FALLBACK");
    expect(decideUpiRecovery({ intentOpened: true, qrShown: true, webhookReceived: false, providerConfirmed: false, minutesSinceAttempt: 12, networkOnline: true }).state).toBe("POLL_PROVIDER");
    expect(decideUpiRecovery({ intentOpened: true, qrShown: true, webhookReceived: false, providerConfirmed: false, minutesSinceAttempt: 4, networkOnline: false }).state).toBe("RETRY_SAFE");
  });

  it("scores COD abuse proportionately and feeds eligibility", () => {
    const risk = scoreCodRisk({ codOrders: 8, codCancellations: 5, refusedDeliveries: 2, unreachableAttempts: 2, orderValue: 3200, trustScore: 38 });
    expect(risk.eligible).toBe(false);
    expect(risk.cooldownRequired).toBe(true);

    const cod = checkCodEligibility({
      items: [createCartItem()],
      total: 900,
      pincode: "600017",
      codHistory: { codOrders: 8, codCancellations: 5, refusedDeliveries: 2, unreachableAttempts: 2, orderValue: 900, trustScore: 38 },
    });
    expect(cod.eligible).toBe(false);
  });

  it("adapts low-bandwidth and regional formatting for India commerce", () => {
    expect(lowBandwidthPolicy("2g").pauseRealtime).toBe(true);
    expect(lowBandwidthPolicy("4g").constrained).toBe(false);
    expect(formatLocalizedCurrency(1234567, "INR", "en")).toContain("12,34,567");
    expect(formatIndianPhone("+91 9876543210")).toBe("+91 98765 43210");
    expect(formatIndianAddress({ line1: "12 Bazaar Road", locality: "T Nagar", city: "Chennai", state: "TN", pincode: "600017" })).toBe("12 Bazaar Road, T Nagar, Chennai, TN, 600017");
  });
});
