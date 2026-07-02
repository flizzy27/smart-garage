"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { importUserBackup } from "@/lib/export/backup";

export type ImportBackupActionResult = {
  ok: boolean;
  error?: "noFile" | "invalidJson" | "invalidBackup" | "importFailed";
  summary?: {
    vehicles: number;
    maintenanceRecords: number;
    expenses: number;
    fuelEntries: number;
    documents: number;
    notes: number;
    wishlistItems: number;
  };
};

function revalidateDataPaths() {
  revalidatePath("/");
  revalidatePath("/vehicles");
  revalidatePath("/maintenance");
  revalidatePath("/history");
  revalidatePath("/fuel");
  revalidatePath("/expenses");
  revalidatePath("/documents");
  revalidatePath("/notes");
  revalidatePath("/wishlist");
  revalidatePath("/settings");
  revalidatePath("/settings/data");
  revalidatePath("/settings/notifications");
}

export async function importBackupAction(
  _prev: ImportBackupActionResult | null,
  formData: FormData,
): Promise<ImportBackupActionResult> {
  const file = formData.get("backupFile");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "noFile" };
  }

  let backup: unknown;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "invalidJson" };
  }

  try {
    const userId = await getCurrentUserId();
    const summary = await importUserBackup(userId, backup);
    revalidateDataPaths();
    return { ok: true, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_BACKUP" || message === "UNSUPPORTED_BACKUP") {
      return { ok: false, error: "invalidBackup" };
    }
    return { ok: false, error: "importFailed" };
  }
}
