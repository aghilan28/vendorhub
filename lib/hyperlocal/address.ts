// MCP-1C Phase 3 — Address Intelligence Platform (deterministic, pure).
//
// Parse / validate / complete / dedupe / eligibility / confidence for buyer,
// seller, store, warehouse and delivery addresses.

import { isValidPincode } from "./location";
import type { AddressReport, ParsedAddress, RawAddress } from "./types";

// Minimal pincode→city/state hints for completion (deterministic, India focus).
const PINCODE_HINTS: Record<string, { city: string; state: string }> = {
  "5": { city: "Bengaluru", state: "Karnataka" }, // 56xxxx
  "6": { city: "Chennai", state: "Tamil Nadu" }, // 60xxxx
  "4": { city: "Mumbai", state: "Maharashtra" }, // 40xxxx
  "1": { city: "New Delhi", state: "Delhi" }, // 11xxxx
  "7": { city: "Kolkata", state: "West Bengal" }, // 70xxxx
};

function cityHint(pincode?: string): { city?: string; state?: string } {
  if (!pincode) return {};
  return PINCODE_HINTS[pincode[0]] ?? {};
}

/** Parse a raw freeform/structured address into canonical parts. */
export function parseAddress(raw: RawAddress): ParsedAddress {
  // structured fields win; otherwise try to split a freeform `raw` string.
  let { line1, locality, city, state, pincode } = raw;
  if ((!line1 || !city || !pincode) && raw.raw) {
    const parts = raw.raw.split(",").map((p) => p.trim()).filter(Boolean);
    const pinMatch = raw.raw.match(/\b[1-9][0-9]{5}\b/);
    pincode = pincode ?? (pinMatch ? pinMatch[0] : undefined);
    line1 = line1 ?? parts[0];
    locality = locality ?? parts[1];
    city = city ?? parts[parts.length - 2]?.replace(/\b[1-9][0-9]{5}\b/, "").trim();
    state = state ?? parts[parts.length - 1]?.replace(/\b[1-9][0-9]{5}\b/, "").trim();
  }
  const hint = cityHint(pincode);
  return {
    line1: (line1 ?? "").trim(),
    locality: (locality ?? "").trim(),
    city: (city || hint.city || "").trim(),
    state: (state || hint.state || "").trim(),
    pincode: (pincode ?? "").trim(),
  };
}

/** Build an address report: validate + complete + eligibility + confidence. */
export function analyzeAddress(raw: RawAddress): AddressReport {
  const parsed = parseAddress(raw);
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (parsed.line1.length < 3) issues.push("Address line is too short.");
  if (!parsed.city) issues.push("City missing.");
  if (!isValidPincode(parsed.pincode)) issues.push("Invalid or missing pincode.");
  if (raw.kind === "delivery" || raw.kind === "buyer") {
    if (!raw.recipient || raw.recipient.trim().length < 2) issues.push("Recipient name required.");
    if (!raw.phone || !/^\+?[0-9\s-]{6,15}$/.test(raw.phone)) issues.push("Valid phone required.");
  }

  // completion suggestions
  const hint = cityHint(parsed.pincode);
  if (!parsed.city && hint.city) suggestions.push(`City may be ${hint.city}.`);
  if (!parsed.state && hint.state) suggestions.push(`State may be ${hint.state}.`);
  if (!parsed.locality) suggestions.push("Add a locality/landmark for accurate delivery.");

  const fields = [parsed.line1, parsed.locality, parsed.city, parsed.state, parsed.pincode];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const hasCoords = typeof raw.latitude === "number" && typeof raw.longitude === "number";
  let confidence = completeness;
  if (isValidPincode(parsed.pincode)) confidence += 10;
  if (hasCoords) confidence += 20;
  confidence = Math.max(0, Math.min(100, confidence - issues.length * 18));

  const valid = issues.length === 0;
  const deliverable = valid && isValidPincode(parsed.pincode);

  return {
    id: raw.id,
    kind: raw.kind,
    parsed,
    valid,
    confidence,
    completeness,
    deliverable,
    issues,
    suggestions,
  };
}

/** Deduplicate a set of addresses (exact normalized match). */
export function deduplicateAddresses(addresses: RawAddress[]): AddressReport[] {
  const seen = new Map<string, string>();
  return addresses.map((raw, i) => {
    const report = analyzeAddress(raw);
    const key = `${report.parsed.line1}|${report.parsed.pincode}`.toLowerCase().replace(/\s+/g, "");
    const ref = raw.id ?? String(i);
    if (report.parsed.line1 && report.parsed.pincode) {
      if (seen.has(key)) {
        report.duplicateOf = seen.get(key);
      } else {
        seen.set(key, ref);
      }
    }
    return report;
  });
}

/** Address suggestions for autocomplete-style completion. */
export function completeAddress(report: AddressReport): ParsedAddress {
  const hint = cityHint(report.parsed.pincode);
  return {
    ...report.parsed,
    city: report.parsed.city || hint.city || "",
    state: report.parsed.state || hint.state || "",
  };
}
