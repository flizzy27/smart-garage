import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createVehicleFileDocument,
  findDocumentForOwner,
  listFileDocumentsForOwner,
  serializeDocument,
  softDeleteDocument,
  type SerializedDocument,
} from "@/lib/repositories/documents";
import { findVehicleById } from "@/lib/repositories/vehicles";
import { isViewableInline } from "@/lib/storage/paths";
import { deleteStoredFile, saveVehicleDocument } from "@/lib/storage/local";
import type { UploadDocumentInput } from "@/lib/validations/document";

function mapError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "INVALID_FILE_TYPE") return "invalidFileType";
    if (error.message === "FILE_TOO_LARGE") return "fileTooLarge";
    if (error.message === "VEHICLE_NOT_FOUND") return "vehicleNotFound";
  }
  return "uploadFailed";
}

export async function getDocumentsPageData(
  vehicleId?: string,
): Promise<{ documents: SerializedDocument[] }> {
  const ownerUserId = await getCurrentUserId();
  const rows = await listFileDocumentsForOwner(ownerUserId, vehicleId);

  return {
    documents: rows.map((row) =>
      serializeDocument(row, isViewableInline(row.mimeType)),
    ),
  };
}

export async function uploadVehicleDocument(
  input: UploadDocumentInput,
  file: File,
) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await findVehicleById(input.vehicleId, ownerUserId);
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");

  const saved = await saveVehicleDocument(input.vehicleId, file);
  const document = await createVehicleFileDocument({
    vehicleId: input.vehicleId,
    uploadedByUserId: ownerUserId,
    file: saved,
    category: input.category ?? null,
    title: input.title ?? null,
    purpose: input.maintenanceRecordId ? "RECEIPT" : undefined,
    maintenanceRecordId: input.maintenanceRecordId ?? null,
  });

  return document.id;
}

export async function deleteVehicleDocument(documentId: string) {
  const ownerUserId = await getCurrentUserId();
  const document = await findDocumentForOwner(documentId, ownerUserId);
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");

  await softDeleteDocument(documentId, ownerUserId);
  await deleteStoredFile(document.storageKey);
}

export async function getDocumentForDownload(
  documentId: string,
  ownerUserId: string,
) {
  const document = await findDocumentForOwner(documentId, ownerUserId);
  if (!document) return null;
  return document;
}

export { mapError as mapDocumentError };
