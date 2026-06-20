import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createFuelEntryRecord,
  deleteFuelEntryRecord,
  listFuelEntriesForOwner,
  serializeFuelEntry,
  type SerializedFuelEntry,
} from "@/lib/repositories/fuel";
import { findVehicleById } from "@/lib/repositories/vehicles";
import type { CreateFuelEntryInput } from "@/lib/validations/fuel";

export async function getFuelPageData(
  vehicleId?: string,
): Promise<{ entries: SerializedFuelEntry[] }> {
  const ownerUserId = await getCurrentUserId();
  const rows = await listFuelEntriesForOwner(ownerUserId, vehicleId);
  return { entries: rows.map(serializeFuelEntry) };
}

export async function createFuelEntry(input: CreateFuelEntryInput) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await findVehicleById(input.vehicleId, ownerUserId);
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");

  const entry = await createFuelEntryRecord({
    vehicleId: input.vehicleId,
    filledAt: new Date(input.filledAt),
    odometerKm: input.odometerKm,
    liters: input.liters,
    totalCostCents: BigInt(input.totalCostCents ?? 0),
    currency: input.currency ?? "EUR",
    stationName: input.stationName,
    note: input.note,
    createdByUserId: ownerUserId,
  });

  if (input.odometerKm != null && input.odometerKm > vehicle.currentOdometerKm) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.vehicle.update({
      where: { id: input.vehicleId },
      data: { currentOdometerKm: input.odometerKm },
    });
  }

  return entry.id;
}

export async function deleteFuelEntry(entryId: string) {
  const ownerUserId = await getCurrentUserId();
  const deleted = await deleteFuelEntryRecord(entryId, ownerUserId);
  if (!deleted) throw new Error("FUEL_ENTRY_NOT_FOUND");
}
