"use server";

import { revalidatePath } from "next/cache";
import { ModificationCategory } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createModification,
  deleteModification,
} from "@/lib/repositories/modifications";
import { findVehicleById } from "@/lib/repositories/vehicles";
import { z } from "zod";
import { optionalEuroAmountSchema } from "@/lib/validations/money";

const modificationSchema = z.object({
  category: z.nativeEnum(ModificationCategory),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  installedAt: z.string().optional().nullable(),
  costCents: optionalEuroAmountSchema,
  addedPowerKw: z.coerce.number().int().optional().nullable(),
  addedPowerPs: z.coerce.number().int().optional().nullable(),
  addedTorqueNm: z.coerce.number().int().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isCustom: z.coerce.boolean().optional(),
});

export type ModificationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createModificationAction(
  vehicleId: string,
  _prev: ModificationActionResult | null,
  formData: FormData,
): Promise<ModificationActionResult> {
  try {
    const ownerUserId = await getCurrentUserId();
    const vehicle = await findVehicleById(vehicleId, ownerUserId);
    if (!vehicle) return { success: false, error: "notFound" };

    const parsed = modificationSchema.parse({
      category: formData.get("category"),
      name: formData.get("name"),
      description: formData.get("description") || null,
      installedAt: formData.get("installedAt") || null,
      costCents: formData.get("costEuros") || null,
      addedPowerKw: formData.get("addedPowerKw") || null,
      addedPowerPs: formData.get("addedPowerPs") || null,
      addedTorqueNm: formData.get("addedTorqueNm") || null,
      notes: formData.get("notes") || null,
      isCustom: formData.get("isCustom") === "true",
    });

    await createModification({
      vehicleId,
      category: parsed.category,
      name: parsed.name,
      description: parsed.description,
      installedAt: parsed.installedAt ? new Date(parsed.installedAt) : null,
      costCents:
        parsed.costCents != null ? BigInt(parsed.costCents) : null,
      addedPowerKw: parsed.addedPowerKw,
      addedPowerPs: parsed.addedPowerPs,
      addedTorqueNm: parsed.addedTorqueNm,
      notes: parsed.notes,
      isCustom: parsed.isCustom ?? false,
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath(`/vehicles/${vehicleId}/edit`);
    return { success: true };
  } catch {
    return { success: false, error: "validationFailed" };
  }
}

export async function deleteModificationFormAction(
  vehicleId: string,
  modificationId: string,
): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await findVehicleById(vehicleId, ownerUserId);
  if (!vehicle) return;

  await deleteModification(modificationId, vehicleId);
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath(`/vehicles/${vehicleId}/edit`);
}
