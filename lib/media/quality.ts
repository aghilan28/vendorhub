// MCP-0A — Media Quality Engine (Section MCP-0A.8)
// Deterministic 0-100 quality scoring from extracted metrics. No I/O.

import type { MediaMetadata, MediaQuality } from "./types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Raw perceptual measurements (0..1 where noted) supplied by analysis. */
export interface QualitySignals {
  /** Mean luminance 0..1 (0 dark, 1 blown out). */
  brightness?: number;
  /** Variance-of-Laplacian style sharpness proxy, 0..1 (1 = sharp). */
  sharpness?: number;
  /** Estimated noise 0..1 (0 = clean). */
  noise?: number;
  /** Probability the image contains a watermark, 0..1. */
  watermark?: number;
  /** Whether a near-duplicate already exists. */
  duplicate?: boolean;
}

const MIN_LONG_EDGE = 1000; // px for a "good" product image long edge
const IDEAL_ASPECTS = [1, 4 / 5, 3 / 4]; // square + common product portraits

function resolutionScore(meta: MediaMetadata): number {
  const longEdge = Math.max(meta.width, meta.height);
  return clamp(longEdge / MIN_LONG_EDGE);
}

function aspectScore(meta: MediaMetadata): number {
  if (!meta.height) return 0;
  const ratio = meta.width / meta.height;
  const closeness = Math.min(...IDEAL_ASPECTS.map((ideal) => Math.abs(ratio - ideal) / ideal));
  return clamp(1 - closeness);
}

function brightnessScore(brightness: number): number {
  // Best around 0.5; penalise very dark / blown out.
  return clamp(1 - Math.abs(brightness - 0.5) * 2);
}

/**
 * Computes a deterministic 0-100 quality score with sub-scores and flags.
 * Missing signals default to neutral assumptions so partial analysis still scores.
 */
export function scoreMediaQuality(meta: MediaMetadata, signals: QualitySignals = {}): MediaQuality {
  const brightness = signals.brightness ?? 0.5;
  const sharpness = signals.sharpness ?? 0.7;
  const noise = signals.noise ?? 0.15;
  const watermark = signals.watermark ?? 0;

  const resolution = resolutionScore(meta);
  const aspect = aspectScore(meta);
  const bright = brightnessScore(brightness);
  const sharp = clamp(sharpness);
  const clean = clamp(1 - noise);
  const watermarkRisk = clamp(watermark);

  const flags: string[] = [];
  if (Math.max(meta.width, meta.height) < MIN_LONG_EDGE) flags.push("low_resolution");
  if (aspect < 0.6) flags.push("awkward_aspect_ratio");
  if (bright < 0.5) flags.push(brightness < 0.5 ? "too_dark" : "overexposed");
  if (sharp < 0.45) flags.push("blurry");
  if (clean < 0.6) flags.push("noisy");
  if (watermarkRisk > 0.5) flags.push("possible_watermark");
  if (signals.duplicate) flags.push("duplicate");
  if (meta.bytes < 8_000) flags.push("suspiciously_small");

  // Weighted composite (resolution + sharpness dominate for product imagery).
  const composite =
    resolution * 0.3 +
    sharp * 0.25 +
    aspect * 0.15 +
    bright * 0.1 +
    clean * 0.1 +
    (1 - watermarkRisk) * 0.1;

  let score = composite * 100;
  if (signals.duplicate) score -= 25;
  score = round(clamp(score / 100) * 100);

  return {
    score,
    resolution: round(resolution * 100),
    aspect: round(aspect * 100),
    brightness: round(bright * 100),
    sharpness: round(sharp * 100),
    noise: round(clean * 100),
    watermarkRisk: round(watermarkRisk * 100),
    flags,
  };
}

/** Qualitative band for dashboards. */
export function qualityBand(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}
