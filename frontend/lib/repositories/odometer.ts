import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";

export type SerializedOdometerLog = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  odometerKm: number;
  recordedAt: string;
  source: string;
  note: string | null;
};

type OdometerLogRow = {
  id: string;
  vehicleId: string;
  odometerKm: number;
  recordedAt: Date;
  source: string;
  note: string | null;
  vehicle: { make: string | null; model: string | null; licensePlate: string | null };
};

function vehicleLabel(vehicle: OdometerLogRow["vehicle"]): string {
  return (
    [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
    vehicle.licensePlate ||
    "—"
  );
}

export function serializeOdometerLog(row: OdometerLogRow): SerializedOdometerLog {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    vehicleName: vehicleLabel(row.vehicle),
    odometerKm: row.odometerKm,
    recordedAt: row.recordedAt.toISOString(),
    source: row.source,
    note: row.note,
  };
}

const LOG_SELECT = {
  id: true,
  vehicleId: true,
  odometerKm: true,
  recordedAt: true,
  source: true,
  note: true,
  vehicle: { select: { make: true, model: true, licensePlate: true } },
} as const;

/**
 * Every odometer reading the user can see: their own vehicles plus vehicles
 * shared with them. Ordered oldest → newest so charts can consume it directly.
 */
export async function listOdometerLogsForOwner(
  userId: string,
  vehicleId?: string,
): Promise<SerializedOdometerLog[]> {
  const rows = await prisma.odometerLog.findMany({
    where: {
      ...(vehicleId ? { vehicleId } : {}),
      vehicle: {
        deletedAt: null,
        OR: [{ ownerUserId: userId }, { shares: { some: { userId } } }],
      },
    },
    orderBy: [{ recordedAt: "asc" }, { odometerKm: "asc" }],
    select: LOG_SELECT,
  });
  return rows.map(serializeOdometerLog);
}

export async function createOdometerLogEntry(input: {
  vehicleId: string;
  userId: string;
  odometerKm: number;
  recordedAt?: Date;
  source?: string;
  note?: string | null;
}) {
  return withDbRetry(() =>
    prisma.odometerLog.create({
      data: {
        vehicleId: input.vehicleId,
        odometerKm: input.odometerKm,
        recordedAt: input.recordedAt ?? new Date(),
        source: input.source ?? "manual",
        note: input.note?.trim() || null,
        createdByUserId: input.userId,
      },
    }),
  );
}

/** Deletes a reading, scoped to vehicles the user may edit. */
export async function deleteOdometerLogEntry(logId: string, userId: string) {
  const deleted = await withDbRetry(() =>
    prisma.odometerLog.deleteMany({
      where: {
        id: logId,
        vehicle: {
          deletedAt: null,
          OR: [
            { ownerUserId: userId },
            { shares: { some: { userId, role: "EDITOR" } } },
          ],
        },
      },
    }),
  );
  return deleted.count > 0;
}
