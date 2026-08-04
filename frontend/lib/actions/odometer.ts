"use server";

import { revalidatePath } from "next/cache";
import { updateOdometerForCurrentUser } from "@/lib/services/vehicles";
import { deleteOdometerReading, logOdometerReading } from "@/lib/services/odometer";
import { parseFormDistanceToKm } from "@/lib/regional/distance";
import { sanitizeDistanceUnit } from "@/lib/settings/sanitize";

export type OdometerActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateOdometerViews(vehicleId?: string) {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/odometer");
  if (vehicleId) revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateOdometerAction(
  _prev: OdometerActionResult | null,
  formData: FormData,
): Promise<OdometerActionResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const distanceUnit = sanitizeDistanceUnit(formData.get("distanceUnit"));
  const km = parseFormDistanceToKm(
    formData.get("currentOdometerKm"),
    distanceUnit,
  );

  const result = await updateOdometerForCurrentUser(vehicleId, km ?? Number.NaN);
  if (!result.success) {
    return { ok: false, error: result.error?.code ?? "unknown" };
  }

  revalidateOdometerViews(vehicleId);
  return { ok: true };
}

/**
 * Logs a reading from the odometer page, where the user can also back-date the
 * entry and add a note (issue #6).
 */
export async function logOdometerReadingAction(
  _prev: OdometerActionResult | null,
  formData: FormData,
): Promise<OdometerActionResult> {
  try {
    const vehicleId = String(formData.get("vehicleId") ?? "");
    const distanceUnit = sanitizeDistanceUnit(formData.get("distanceUnit"));
    const odometerKm = parseFormDistanceToKm(formData.get("odometerKm"), distanceUnit);
    if (odometerKm == null) return { ok: false, error: "odometerInvalid" };

    const recordedAtRaw = String(formData.get("recordedAt") ?? "").trim();
    const recordedAt = recordedAtRaw ? new Date(recordedAtRaw) : undefined;
    if (recordedAt && Number.isNaN(recordedAt.getTime())) {
      return { ok: false, error: "dateInvalid" };
    }

    await logOdometerReading({
      vehicleId,
      odometerKm,
      recordedAt,
      note: String(formData.get("note") ?? "") || null,
    });

    revalidateOdometerViews(vehicleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

export async function deleteOdometerReadingAction(
  _prev: OdometerActionResult | null,
  formData: FormData,
): Promise<OdometerActionResult> {
  try {
    await deleteOdometerReading(String(formData.get("logId") ?? ""));
    revalidateOdometerViews();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}
