import { messages } from "@/lib/i18n/messages";
import { validateLocaleCatalog } from "@/lib/i18n/governance";
import { decideUpiRecovery } from "./payments";

export function runLocalizationQualityAudit() {
  const locales = validateLocaleCatalog(messages);
  const fallbackRequired = locales.filter((locale) => locale.suspiciousKeys.length || locale.missingKeys.length);
  return {
    locales,
    fallbackRequired,
    healthy: fallbackRequired.length === 0,
  };
}

export function runUpiRecoveryAssessment(input: Parameters<typeof decideUpiRecovery>[0]) {
  return decideUpiRecovery(input);
}
