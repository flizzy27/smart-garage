"use server";

import { revalidatePath } from "next/cache";
import {
  deleteVehicleDocument,
  mapDocumentError,
  uploadVehicleDocument,
} from "@/lib/services/documents";
import { uploadDocumentSchema } from "@/lib/validations/document";

export type DocumentActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateDocumentPaths(vehicleId?: string) {
  revalidatePath("/documents");
  if (vehicleId) {
    revalidatePath(`/vehicles/${vehicleId}`);
  }
}

export async function uploadDocumentAction(
  _prev: DocumentActionResult | null,
  formData: FormData,
): Promise<DocumentActionResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "noFile" };
    }

    const parsed = uploadDocumentSchema.parse({
      vehicleId: formData.get("vehicleId"),
      category: formData.get("category") || null,
      title: formData.get("title") || null,
      maintenanceRecordId: formData.get("maintenanceRecordId") || null,
    });

    await uploadVehicleDocument(parsed, file);
    revalidateDocumentPaths(parsed.vehicleId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapDocumentError(error) };
  }
}

export async function deleteDocumentAction(
  documentId: string,
  vehicleId?: string | null,
): Promise<DocumentActionResult> {
  try {
    await deleteVehicleDocument(documentId);
    revalidateDocumentPaths(vehicleId ?? undefined);
    return { ok: true };
  } catch {
    return { ok: false, error: "deleteFailed" };
  }
}

export async function deleteDocumentFormAction(
  documentId: string,
  vehicleId?: string | null,
): Promise<void> {
  await deleteDocumentAction(documentId, vehicleId);
}
