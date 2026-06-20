import type {
  MaintenanceCategory,
  MaintenanceDueStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type { Locale } from "@/lib/i18n/routing";
import { computeNextDue } from "@/lib/maintenance/scheduler";
import { scheduleDisplayName } from "@/lib/maintenance/display";
import { prisma } from "@/lib/prisma";

const scheduleInclude = {
  template: true,
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      licensePlate: true,
      currentOdometerKm: true,
    },
  },
} satisfies Prisma.VehicleMaintenanceScheduleInclude;

export async function listMaintenanceTemplates() {
  return prisma.maintenanceTemplate.findMany({
    where: { isSystem: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function listSchedulesForVehicle(vehicleId: string) {
  return prisma.vehicleMaintenanceSchedule.findMany({
    where: { vehicleId, isActive: true },
    include: scheduleInclude,
    orderBy: [{ dueStatus: "desc" }, { nextDueAt: "asc" }],
  });
}

export async function listSchedulesForOwner(ownerUserId: string) {
  return prisma.vehicleMaintenanceSchedule.findMany({
    where: {
      isActive: true,
      vehicle: { ownerUserId, deletedAt: null },
    },
    include: scheduleInclude,
    orderBy: [{ dueStatus: "desc" }, { nextDueAt: "asc" }],
  });
}

export async function findScheduleById(scheduleId: string, ownerUserId: string) {
  return prisma.vehicleMaintenanceSchedule.findFirst({
    where: {
      id: scheduleId,
      vehicle: { ownerUserId, deletedAt: null },
    },
    include: scheduleInclude,
  });
}

export async function refreshScheduleDueStatus(
  client: PrismaClient,
  scheduleId: string,
): Promise<void> {
  const schedule = await client.vehicleMaintenanceSchedule.findUnique({
    where: { id: scheduleId },
    include: { vehicle: { select: { currentOdometerKm: true } } },
  });
  if (!schedule) return;

  const computed = computeNextDue(
    {
      intervalKm: schedule.intervalKm,
      intervalMonths: schedule.intervalMonths,
    },
    {
      performedAt: schedule.lastPerformedAt,
      odometerKm: schedule.lastOdometerKm,
    },
    schedule.vehicle.currentOdometerKm,
  );

  await client.vehicleMaintenanceSchedule.update({
    where: { id: scheduleId },
    data: {
      nextDueAt: computed.nextDueAt,
      nextDueOdometerKm: computed.nextDueOdometerKm,
      dueStatus: computed.dueStatus,
    },
  });
}

export async function refreshAllScheduleDueStatuses(ownerUserId: string) {
  const schedules = await prisma.vehicleMaintenanceSchedule.findMany({
    where: {
      isActive: true,
      vehicle: { ownerUserId, deletedAt: null },
    },
    select: { id: true },
  });

  for (const schedule of schedules) {
    await refreshScheduleDueStatus(prisma, schedule.id);
  }
}

export type SerializedSchedule = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  name: string;
  category: MaintenanceCategory;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastPerformedAt: string | null;
  lastOdometerKm: number | null;
  nextDueAt: string | null;
  nextDueOdometerKm: number | null;
  estimatedCostCents: number | null;
  currency: string;
  dueStatus: MaintenanceDueStatus;
  dueInDays: number | null;
  dueInKm: number | null;
  notes: string | null;
  isCustom: boolean;
  templateSlug: string | null;
};

export function serializeSchedule(
  schedule: Prisma.VehicleMaintenanceScheduleGetPayload<{ include: typeof scheduleInclude }>,
  locale: Locale,
): SerializedSchedule {
  const computed = computeNextDue(
    {
      intervalKm: schedule.intervalKm,
      intervalMonths: schedule.intervalMonths,
    },
    {
      performedAt: schedule.lastPerformedAt,
      odometerKm: schedule.lastOdometerKm,
    },
    schedule.vehicle.currentOdometerKm,
  );

  const vehicleName = [schedule.vehicle.make, schedule.vehicle.model]
    .filter(Boolean)
    .join(" ");

  return {
    id: schedule.id,
    vehicleId: schedule.vehicleId,
    vehicleName: vehicleName || schedule.vehicle.licensePlate || "Vehicle",
    name: scheduleDisplayName(schedule, locale),
    category: schedule.category,
    intervalKm: schedule.intervalKm,
    intervalMonths: schedule.intervalMonths,
    lastPerformedAt: schedule.lastPerformedAt?.toISOString() ?? null,
    lastOdometerKm: schedule.lastOdometerKm,
    nextDueAt: computed.nextDueAt?.toISOString() ?? schedule.nextDueAt?.toISOString() ?? null,
    nextDueOdometerKm: computed.nextDueOdometerKm ?? schedule.nextDueOdometerKm,
    estimatedCostCents: schedule.estimatedCostCents
      ? Number(schedule.estimatedCostCents)
      : null,
    currency: schedule.currency,
    dueStatus: computed.dueStatus,
    dueInDays: computed.dueInDays,
    dueInKm: computed.dueInKm,
    notes: schedule.notes,
    isCustom: !schedule.templateId,
    templateSlug: schedule.template?.slug ?? null,
  };
}

export async function getUpcomingSchedulesForOwner(
  ownerUserId: string,
  locale: Locale,
  limit = 10,
) {
  await refreshAllScheduleDueStatuses(ownerUserId);

  const schedules = await prisma.vehicleMaintenanceSchedule.findMany({
    where: {
      isActive: true,
      dueStatus: { in: ["DUE_SOON", "OVERDUE"] },
      vehicle: { ownerUserId, deletedAt: null },
    },
    include: scheduleInclude,
    take: limit * 2,
  });

  return schedules
    .map((schedule) => serializeSchedule(schedule, locale))
    .sort((a, b) => {
      const statusOrder = { OVERDUE: 0, DUE_SOON: 1, OK: 2 };
      const diff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus];
      if (diff !== 0) return diff;
      return (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999);
    })
    .slice(0, limit);
}

export async function countDueSchedulesForOwner(ownerUserId: string) {
  await refreshAllScheduleDueStatuses(ownerUserId);
  return prisma.vehicleMaintenanceSchedule.count({
    where: {
      isActive: true,
      dueStatus: { in: ["DUE_SOON", "OVERDUE"] },
      vehicle: { ownerUserId, deletedAt: null },
    },
  });
}
