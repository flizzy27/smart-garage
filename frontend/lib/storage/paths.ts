import path from "node:path";

export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), "..", "data", "uploads");
}

export function getMaxImageSizeBytes(): number {
  const mb = Number(process.env.MAX_IMAGE_SIZE_MB ?? "10");
  return mb * 1024 * 1024;
}

export function getMaxUploadSizeBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "25");
  return mb * 1024 * 1024;
}

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  "application/pdf",
]);

export function isViewableInline(mimeType: string): boolean {
  return (
    ALLOWED_IMAGE_MIME_TYPES.has(mimeType) || mimeType === "application/pdf"
  );
}

/** Resolve storage key to absolute path; rejects path traversal. */
export function resolveStoredFilePath(storageKey: string): string {
  const root = path.resolve(getUploadRoot());
  const normalizedKey = storageKey.replace(/\\/g, "/");
  if (normalizedKey.includes("..") || path.isAbsolute(normalizedKey)) {
    throw new Error("INVALID_STORAGE_KEY");
  }
  const absolutePath = path.resolve(root, normalizedKey);
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) {
    throw new Error("INVALID_STORAGE_KEY");
  }
  return absolutePath;
}
