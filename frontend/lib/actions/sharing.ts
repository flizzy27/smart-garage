"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  addVehicleShare,
  removeVehicleShare,
  updateVehicleShareRole,
} from "@/lib/repositories/vehicle-shares";
import type { VehicleShareRole } from "@prisma/client";

export async function shareVehicleAction(
  vehicleId: string,
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ownerUserId = await getCurrentUserId();
  const username = String(formData.get("username") ?? "").trim();
  const role = String(formData.get("role") ?? "VIEWER") as VehicleShareRole;

  const result = await addVehicleShare(vehicleId, ownerUserId, username, role);
  if ("error" in result && result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function removeShareFormAction(formData: FormData) {
  const shareId = String(formData.get("shareId") ?? "");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const ownerUserId = await getCurrentUserId();
  await removeVehicleShare(shareId, ownerUserId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateShareRoleAction(
  shareId: string,
  vehicleId: string,
  role: VehicleShareRole,
): Promise<{ ok: boolean }> {
  const ownerUserId = await getCurrentUserId();
  await updateVehicleShareRole(shareId, ownerUserId, role);
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}
