"use server";

import {
  createVehicleForCurrentUser,
  deleteVehicleForCurrentUser,
  updateVehicleForCurrentUser,
  type VehicleActionResult,
} from "@/lib/services/vehicles";

export async function createVehicleAction(
  _prevState: VehicleActionResult | null,
  formData: FormData,
): Promise<VehicleActionResult | null> {
  return createVehicleForCurrentUser(formData);
}

export async function updateVehicleAction(
  vehicleId: string,
  _prevState: VehicleActionResult | null,
  formData: FormData,
): Promise<VehicleActionResult | null> {
  return updateVehicleForCurrentUser(vehicleId, formData);
}

export async function deleteVehicleAction(
  vehicleId: string,
): Promise<{ success: true } | { success: false; error: { code: string } }> {
  const result = await deleteVehicleForCurrentUser(vehicleId);
  if (!result.success) {
    return {
      success: false,
      error: { code: result.error?.code ?? "unknown" },
    };
  }
  return { success: true };
}
