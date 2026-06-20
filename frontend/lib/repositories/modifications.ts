import { ModificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeCurrentPowerFromModifications,
  computeCurrentTorqueFromModifications,
} from "@/lib/catalog/resolve-spec";

export async function listModificationsForVehicle(vehicleId: string) {
  return prisma.vehicleModification.findMany({
    where: { vehicleId },
    orderBy: [{ installedAt: "desc" }, { createdAt: "desc" }],
  });
}

export type CreateModificationData = {
  vehicleId: string;
  category: ModificationCategory;
  name: string;
  description?: string | null;
  installedAt?: Date | null;
  costCents?: bigint | null;
  currency?: string | null;
  addedPowerKw?: number | null;
  addedPowerPs?: number | null;
  addedTorqueNm?: number | null;
  notes?: string | null;
  isCustom?: boolean;
};

export async function createModification(data: CreateModificationData) {
  const mod = await prisma.vehicleModification.create({
    data: {
      vehicleId: data.vehicleId,
      category: data.category,
      name: data.name,
      description: data.description ?? null,
      installedAt: data.installedAt ?? null,
      costCents: data.costCents ?? null,
      currency: data.currency ?? "EUR",
      addedPowerKw: data.addedPowerKw ?? null,
      addedPowerPs: data.addedPowerPs ?? null,
      addedTorqueNm: data.addedTorqueNm ?? null,
      notes: data.notes ?? null,
      isCustom: data.isCustom ?? false,
    },
  });

  await recalculateVehicleCurrentSpec(data.vehicleId);
  return mod;
}

export async function deleteModification(id: string, vehicleId: string) {
  const result = await prisma.vehicleModification.deleteMany({
    where: { id, vehicleId },
  });
  if (result.count > 0) {
    await recalculateVehicleCurrentSpec(vehicleId);
  }
  return result;
}

async function recalculateVehicleCurrentSpec(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      factorySpecs: true,
      currentSpecs: true,
      modifications: true,
    },
  });

  if (!vehicle?.factorySpecs) return;

  const power = computeCurrentPowerFromModifications(
    vehicle.factorySpecs.powerKw,
    vehicle.factorySpecs.powerPs,
    vehicle.modifications,
  );
  const torque = computeCurrentTorqueFromModifications(
    vehicle.factorySpecs.torqueNm,
    vehicle.modifications,
  );

  await prisma.vehicleCurrentSpec.upsert({
    where: { vehicleId },
    create: {
      vehicleId,
      engineCode: vehicle.factorySpecs.engineCode,
      engineDescription: vehicle.factorySpecs.engineDescription,
      powerKw: power.powerKw,
      powerPs: power.powerPs,
      torqueNm: torque,
      fuelType: vehicle.factorySpecs.fuelType,
      displacementCc: vehicle.factorySpecs.displacementCc,
      bodyType: vehicle.factorySpecs.bodyType,
      driveType: vehicle.factorySpecs.driveType,
      transmissionTypes: vehicle.factorySpecs.transmissionTypes ?? undefined,
    },
    update: {
      powerKw: power.powerKw,
      powerPs: power.powerPs,
      torqueNm: torque,
    },
  });
}
