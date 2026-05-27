import { AppError } from "@/lib/errors";

const allowedMimeByBucket: Record<string, Set<string>> = {
  "product-images": new Set(["image/jpeg", "image/png", "image/webp"]),
  "vendor-assets": new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  "profile-images": new Set(["image/jpeg", "image/png", "image/webp"]),
  "kyc-documents": new Set(["application/pdf", "image/jpeg", "image/png"]),
};

const defaultMaxBytes = 5 * 1024 * 1024;

export function assertSafeUpload(input: { bucket: string; mimeType: string; sizeBytes: number; filename: string }) {
  const allowed = allowedMimeByBucket[input.bucket];
  if (!allowed) throw new AppError("FORBIDDEN", "Uploads are not allowed for this storage bucket.");
  if (!allowed.has(input.mimeType)) throw new AppError("VALIDATION_ERROR", "Unsupported upload file type.");
  if (input.sizeBytes <= 0 || input.sizeBytes > defaultMaxBytes) throw new AppError("VALIDATION_ERROR", "Upload size is outside allowed limits.");
  if (!/^[a-zA-Z0-9._ -]+$/.test(input.filename) || input.filename.includes("..")) {
    throw new AppError("VALIDATION_ERROR", "Unsafe upload filename.");
  }
}
