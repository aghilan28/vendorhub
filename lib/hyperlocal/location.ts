// MCP-1C Phase 2 — Location Foundation Engine (deterministic, pure).
//
// Normalize / validate / resolve / score / confidence for locations, plus a
// dependency-free geohash. Reuses lib/geo `isValidCoordinates`.

import { isValidCoordinates } from "@/lib/geo";
import type { Coordinates, LocationResolution, NormalizedLocation } from "./types";

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Dependency-free geohash encoder (default precision 7 ≈ 150m cell). */
export function geohash(coordinates: Coordinates, precision = 7): string {
  if (!isValidCoordinates(coordinates)) return "";
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (coordinates.longitude >= mid) {
        ch = (ch << 1) + 1;
        lonMin = mid;
      } else {
        ch <<= 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (coordinates.latitude >= mid) {
        ch = (ch << 1) + 1;
        latMin = mid;
      } else {
        ch <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface RawLocation {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  zone?: string;
  locality?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

/** Normalize a raw location into a canonical shape (with geohash). */
export function normalizeLocation(raw: RawLocation): NormalizedLocation {
  const coordinates =
    typeof raw.latitude === "number" && typeof raw.longitude === "number"
      ? { latitude: raw.latitude, longitude: raw.longitude }
      : null;
  return {
    country: raw.country ? titleCase(raw.country) : "India",
    state: raw.state ? titleCase(raw.state) : undefined,
    district: raw.district ? titleCase(raw.district) : undefined,
    city: raw.city ? titleCase(raw.city) : undefined,
    zone: raw.zone ? titleCase(raw.zone) : undefined,
    locality: raw.locality ? titleCase(raw.locality) : undefined,
    pincode: raw.pincode?.trim(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    geohash: coordinates && isValidCoordinates(coordinates) ? geohash(coordinates) : undefined,
  };
}

export function isValidPincode(pincode?: string): boolean {
  return Boolean(pincode && /^[1-9][0-9]{5}$/.test(pincode));
}

/** Resolve a location into validity + completeness score + confidence. */
export function resolveLocation(raw: RawLocation): LocationResolution {
  const location = normalizeLocation(raw);
  const issues: string[] = [];

  const hasCoords = typeof location.latitude === "number" && typeof location.longitude === "number" && isValidCoordinates({ latitude: location.latitude, longitude: location.longitude });
  if (!hasCoords && (location.latitude !== undefined || location.longitude !== undefined)) issues.push("Invalid coordinates.");
  if (location.pincode && !isValidPincode(location.pincode)) issues.push("Invalid pincode.");
  if (!location.city && !location.pincode && !hasCoords) issues.push("No city, pincode or coordinates.");

  // completeness score over the location hierarchy
  const fields: Array<keyof NormalizedLocation> = ["country", "state", "city", "locality", "pincode"];
  const present = fields.filter((f) => Boolean(location[f])).length;
  const score = Math.round((present / fields.length) * 100);

  // confidence: coordinates + valid pincode raise it
  let confidence = score;
  if (hasCoords) confidence = Math.min(100, confidence + 25);
  if (isValidPincode(location.pincode)) confidence = Math.min(100, confidence + 10);
  confidence = Math.max(0, confidence - issues.length * 15);

  const valid = issues.length === 0 && (hasCoords || isValidPincode(location.pincode) || Boolean(location.city));

  return { location, valid, confidence: Math.max(0, Math.min(100, confidence)), score, issues };
}

/** Two locations are "near" when their geohash prefixes match (cell adjacency proxy). */
export function sameCell(a: Coordinates, b: Coordinates, precision = 6): boolean {
  return geohash(a, precision) === geohash(b, precision);
}
