import type { Locale } from "@/lib/i18n/routing";
import { scheduleDisplayName } from "@/lib/maintenance/display";
import { prisma } from "@/lib/prisma";

export type SerializedMaintenanceRecord = {
  id: string;
  scheduleId: string | null;
  vehicleId: string;
  vehicleName: string;
  serviceName: string;
  performedAt: string;
  odometerKm: number | null;
  costCents: number;
  currency: string;
  vendorName: string | null;
  note: string | null;
};

const recordInclude = {
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      licensePlate: true,
      ownerUserId: true,
    },
  },
  schedule: {
    include: { template: true },
  },
} as const;

type RecordRow = Awaited<
  ReturnType<
    typeof prisma.maintenanceRecord.findMany<{ include: typeof recordInclude }>
  >
>[number];

function vehicleLabel(
  vehicle: RecordRow["vehicle"],
): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || vehicle.licensePlate || "Vehicle";
}

function serviceName(record: RecordRow, locale: Locale): string {
  if (record.title?.trim()) return record.title.trim();
  if (record.schedule) return scheduleDisplayName(record.schedule, locale);
  return locale === "de" ? "Wartung" : "Maintenance";
}

export function serializeMaintenanceRecord(
  record: RecordRow,
  locale: Locale,
): SerializedMaintenanceRecord {
  return {
    id: record.id,
    scheduleId: record.scheduleId,
    vehicleId: record.vehicleId,
    vehicleName: vehicleLabel(record.vehicle),
    serviceName: serviceName(record, locale),
    performedAt: record.performedAt.toISOString(),
    odometerKm: record.odometerKm,
    costCents: Number(record.costCents),
    currency: record.currency,
    vendorName: record.vendorName,
    note: record.note,
  };
}

export async function listRecordsForSchedule(
  scheduleId: string,
  ownerUserId: string,
  locale: Locale,
) {
  const records = await prisma.maintenanceRecord.findMany({
    where: {
      scheduleId,
      vehicle: { ownerUserId, deletedAt: null },
    },
    include: recordInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map((record) => serializeMaintenanceRecord(record, locale));
}

export async function countRecordsForSchedule(
  scheduleId: string,
  ownerUserId: string,
) {
  return prisma.maintenanceRecord.count({
    where: {
      scheduleId,
      vehicle: { ownerUserId, deletedAt: null },
    },
  });
}

export async function listAllRecordsForOwner(
  ownerUserId: string,
  locale: Locale,
  limit = 200,
) {
  const records = await prisma.maintenanceRecord.findMany({
    where: {
      vehicle: { ownerUserId, deletedAt: null },
    },
    include: recordInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return records.map((record) => serializeMaintenanceRecord(record, locale));
}
