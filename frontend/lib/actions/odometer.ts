"use server";

import { revalidatePath } from "next/cache";
import { updateOdometerForCurrentUser } from "@/lib/services/vehicles";

export type OdometerActionResult = {
  ok: boolean;
  error?: string;
};

export async function updateOdometerAction(
  _prev: OdometerActionResult | null,
  formData: FormData,
): Promise<OdometerActionResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const km = Number(formData.get("currentOdometerKm"));

  const result = await updateOdometerForCurrentUser(vehicleId, km);
  if (!result.success) {
    return { ok: false, error: result.error?.code ?? "unknown" };
  }

  revalidatePath("/");
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}
