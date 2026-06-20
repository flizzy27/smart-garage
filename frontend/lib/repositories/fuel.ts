import { prisma } from "@/lib/prisma";

export type SerializedFuelEntry = {
  id: string;
  vehicleId: string;
  vehicleName: string | null;
  filledAt: string;
  odometerKm: number | null;
  liters: number | null;
  totalCostCents: number;
  currency: string;
  stationName: string | null;
  note: string | null;
};

const fuelInclude = {
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      licensePlate: true,
      ownerUserId: true,
    },
  },
} as const;

type FuelRow = Awaited<
  ReturnType<typeof prisma.fuelEntry.findMany<{ include: typeof fuelInclude }>>
>[number];

function vehicleLabel(vehicle: FuelRow["vehicle"]): string | null {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || vehicle.licensePlate || null;
}

export function serializeFuelEntry(entry: FuelRow): SerializedFuelEntry {
  return {
    id: entry.id,
    vehicleId: entry.vehicleId,
    vehicleName: vehicleLabel(entry.vehicle),
    filledAt: entry.filledAt.toISOString(),
    odometerKm: entry.odometerKm,
    liters: entry.liters,
    totalCostCents: Number(entry.totalCostCents),
    currency: entry.currency,
    stationName: entry.stationName,
    note: entry.note,
  };
}

export async function listFuelEntriesForOwner(
  ownerUserId: string,
  vehicleId?: string,
) {
  return prisma.fuelEntry.findMany({
    where: {
      vehicle: { ownerUserId, deletedAt: null },
      ...(vehicleId ? { vehicleId } : {}),
    },
    include: fuelInclude,
    orderBy: [{ filledAt: "desc" }],
  });
}

export async function createFuelEntryRecord(input: {
  vehicleId: string;
  filledAt: Date;
  odometerKm?: number | null;
  liters?: number | null;
  totalCostCents: bigint;
  currency: string;
  stationName?: string | null;
  note?: string | null;
  createdByUserId: string;
}) {
  return prisma.fuelEntry.create({
    data: {
      vehicleId: input.vehicleId,
      filledAt: input.filledAt,
      odometerKm: input.odometerKm ?? null,
      liters: input.liters ?? null,
      totalCostCents: input.totalCostCents,
      currency: input.currency,
      stationName: input.stationName?.trim() || null,
      note: input.note?.trim() || null,
      createdByUserId: input.createdByUserId,
    },
    include: fuelInclude,
  });
}

export async function deleteFuelEntryRecord(entryId: string, ownerUserId: string) {
  const entry = await prisma.fuelEntry.findFirst({
    where: {
      id: entryId,
      vehicle: { ownerUserId, deletedAt: null },
    },
  });
  if (!entry) return false;
  await prisma.fuelEntry.delete({ where: { id: entryId } });
  return true;
}

export async function countFuelEntriesForVehicle(vehicleId: string) {
  return prisma.fuelEntry.count({ where: { vehicleId } });
}
