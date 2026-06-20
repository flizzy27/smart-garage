"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  deleteInspection,
  upsertInspection,
  type InspectionInput,
} from "@/lib/repositories/inspections";

export async function saveInspectionAction(
  vehicleId: string,
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const type = String(formData.get("type"));
    if (type !== "HU" && type !== "AU") return { ok: false, error: "invalidType" };

    const nextDueRaw = String(formData.get("nextDueAt"));
    const nextDueAt = new Date(nextDueRaw);
    if (Number.isNaN(nextDueAt.getTime())) return { ok: false, error: "invalidDate" };

    const lastRaw = String(formData.get("lastPerformedAt") ?? "");
    const lastPerformedAt = lastRaw ? new Date(lastRaw) : null;

    const data: InspectionInput = {
      type,
      nextDueAt,
      lastPerformedAt,
      reminderWeeksBefore: Number(formData.get("reminderWeeksBefore") ?? 4),
      stickerNumber: String(formData.get("stickerNumber") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    };

    const result = await upsertInspection(vehicleId, userId, data);
    if (!result) return { ok: false, error: "notAllowed" };

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/reminders");
    return { ok: true };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function deleteInspectionFormAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const userId = await getCurrentUserId();
  await deleteInspection(inspectionId, userId);
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath("/reminders");
}
