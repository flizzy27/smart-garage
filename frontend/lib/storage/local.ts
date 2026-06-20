import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  getMaxImageSizeBytes,
  getMaxUploadSizeBytes,
  resolveStoredFilePath,
} from "./paths";

export type SavedFile = {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
};

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}

async function saveFileToStorage(
  storageKey: string,
  file: File,
  allowedMimeTypes: Set<string>,
  maxBytes: number,
): Promise<SavedFile> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("INVALID_FILE_TYPE");
  }

  if (file.size > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const absolutePath = resolveStoredFilePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    storageKey,
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: BigInt(file.size),
  };
}

export async function saveVehicleImage(
  vehicleId: string,
  file: File,
): Promise<SavedFile> {
  const ext = extensionForMime(file.type) || path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const storageKey = path.posix.join("vehicles", vehicleId, filename);
  return saveFileToStorage(
    storageKey,
    file,
    ALLOWED_IMAGE_MIME_TYPES,
    getMaxImageSizeBytes(),
  );
}

export async function saveVehicleDocument(
  vehicleId: string,
  file: File,
): Promise<SavedFile> {
  const ext = extensionForMime(file.type) || path.extname(file.name) || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const storageKey = path.posix.join(
    "vehicles",
    vehicleId,
    "documents",
    filename,
  );
  return saveFileToStorage(
    storageKey,
    file,
    ALLOWED_DOCUMENT_MIME_TYPES,
    getMaxUploadSizeBytes(),
  );
}

export async function saveUserBackgroundImage(
  userId: string,
  file: File,
): Promise<SavedFile> {
  const ext = extensionForMime(file.type) || path.extname(file.name) || ".jpg";
  const storageKey = path.posix.join("users", userId, `background${ext}`);
  return saveFileToStorage(
    storageKey,
    file,
    ALLOWED_IMAGE_MIME_TYPES,
    getMaxImageSizeBytes(),
  );
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveStoredFilePath(storageKey);
  return readFile(absolutePath);
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const absolutePath = resolveStoredFilePath(storageKey);
  try {
    await unlink(absolutePath);
  } catch {
    // File may already be removed
  }
}
