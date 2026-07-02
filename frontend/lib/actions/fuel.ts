"use server";

import { revalidatePath } from "next/cache";
import { createFuelEntry, deleteFuelEntry } from "@/lib/services/fuel";
import { parseFormDistanceToKm } from "@/lib/regional/distance";
import { sanitizeDistanceUnit } from "@/lib/settings/sanitize";
import { createFuelEntrySchema } from "@/lib/validations/fuel";

export type FuelActionResult = {
  ok: boolean;
  error?: string;
};

export async function createFuelEntryAction(
  _prev: FuelActionResult | null,
  formData: FormData,
): Promise<FuelActionResult> {
  try {
    const distanceUnit = sanitizeDistanceUnit(formData.get("distanceUnit"));
    const parsed = createFuelEntrySchema.parse({
      vehicleId: formData.get("vehicleId"),
      filledAt: formData.get("filledAt"),
      odometerKm: parseFormDistanceToKm(formData.get("odometerKm"), distanceUnit),
      liters: formData.get("liters") || undefined,
      totalCostCents: formData.get("amountEuros") || undefined,
      currency: formData.get("currency") || undefined,
      stationName: formData.get("stationName") || undefined,
      note: formData.get("note") || undefined,
    });

    await createFuelEntry(parsed);
    revalidatePath("/fuel");
    revalidatePath(`/vehicles/${parsed.vehicleId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create fuel entry",
    };
  }
}

export async function deleteFuelEntryAction(
  _prev: FuelActionResult | null,
  formData: FormData,
): Promise<FuelActionResult> {
  try {
    const entryId = String(formData.get("entryId") ?? "");
    await deleteFuelEntry(entryId);
    revalidatePath("/fuel");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete fuel entry",
    };
  }
}
