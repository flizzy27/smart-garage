"use server";

import { revalidatePath } from "next/cache";
import { updateOdometerForCurrentUser } from "@/lib/services/vehicles";
import { parseFormDistanceToKm } from "@/lib/regional/distance";
import { sanitizeDistanceUnit } from "@/lib/settings/sanitize";

export type OdometerActionResult = {
  ok: boolean;
  error?: string;
};

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

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}
