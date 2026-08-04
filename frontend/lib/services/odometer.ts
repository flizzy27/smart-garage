import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  computeOdometerAnalytics,
  type OdometerAnalytics,
} from "@/lib/fuel/odometer-analytics";
import {
  createOdometerLogEntry,
  deleteOdometerLogEntry,
  listOdometerLogsForOwner,
  type SerializedOdometerLog,
} from "@/lib/repositories/odometer";
import { listAccessibleVehicles } from "@/lib/repositories/vehicles";
import { resolveVehicleAccess } from "@/lib/vehicles/access";
import { prisma } from "@/lib/prisma";

export type OdometerPageData = {
  logs: SerializedOdometerLog[];
  analytics: OdometerAnalytics;
  vehicles: { id: string; label: string }[];
};

export async function getOdometerPageData(
  vehicleId?: string,
): Promise<OdometerPageData> {
  const userId = await getCurrentUserId();
  const [logs, vehicles] = await Promise.all([
    listOdometerLogsForOwner(userId, vehicleId),
    listAccessibleVehicles(userId),
  ]);

  return {
    logs,
    analytics: computeOdometerAnalytics(logs),
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      label:
        [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
        vehicle.licensePlate ||
        vehicle.id,
    })),
  };
}

/**
 * Records a reading and, when it is the newest one, moves the vehicle's current
 * odometer forward. Back-dated or lower readings are still stored (they belong
 * in the history) but must never pull the current reading down — the same rule
 * the maintenance history follows.
 */
export async function logOdometerReading(input: {
  vehicleId: string;
  odometerKm: number;
  recordedAt?: Date;
  note?: string | null;
}) {
  const userId = await getCurrentUserId();
  const access = await resolveVehicleAccess(userId, input.vehicleId);
  if (!access?.canEdit) throw new Error("VEHICLE_NOT_FOUND");

  if (!Number.isFinite(input.odometerKm) || input.odometerKm < 0) {
    throw new Error("ODOMETER_INVALID");
  }

  const odometerKm = Math.round(input.odometerKm);

  await createOdometerLogEntry({
    vehicleId: input.vehicleId,
    userId,
    odometerKm,
    recordedAt: input.recordedAt,
    note: input.note ?? null,
  });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
    select: { currentOdometerKm: true },
  });

  if (vehicle && odometerKm > vehicle.currentOdometerKm) {
    await prisma.vehicle.update({
      where: { id: input.vehicleId },
      data: { currentOdometerKm: odometerKm },
    });
  }
}

export async function deleteOdometerReading(logId: string) {
  const userId = await getCurrentUserId();
  const deleted = await deleteOdometerLogEntry(logId, userId);
  if (!deleted) throw new Error("ODOMETER_LOG_NOT_FOUND");
}
