import type { MaintenanceCategory } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { computeNextDue } from "@/lib/maintenance/scheduler";
import { MAINTENANCE_TEMPLATE_SEEDS } from "@/lib/maintenance/templates-data";
import {
  findScheduleById,
  listMaintenanceTemplates,
  listSchedulesForOwner,
  listSchedulesForVehicle,
  refreshScheduleDueStatus,
  serializeSchedule,
  getUpcomingSchedulesForOwner,
  countDueSchedulesForOwner,
} from "@/lib/repositories/maintenance";
import {
  listAllRecordsForOwner,
  listRecordsForSchedule,
} from "@/lib/repositories/maintenance-records";
import type { Locale } from "@/lib/i18n/routing";
import type {
  CreateScheduleInput,
  LogMaintenanceInput,
  UpdateScheduleInput,
} from "@/lib/validations/maintenance";
import { prisma } from "@/lib/prisma";

export async function getMaintenancePageData(locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const [templates, schedules] = await Promise.all([
    listMaintenanceTemplates(),
    listSchedulesForOwner(ownerUserId),
  ]);

  return {
    templates,
    schedules: schedules.map((s) => serializeSchedule(s, locale)),
  };
}

export async function getScheduleDetailData(scheduleId: string, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  await refreshScheduleDueStatus(prisma, scheduleId);
  const schedule = await findScheduleById(scheduleId, ownerUserId);
  if (!schedule) return null;

  const records = await listRecordsForSchedule(scheduleId, ownerUserId, locale);

  return {
    schedule: serializeSchedule(schedule, locale),
    records,
    currentOdometerKm: schedule.vehicle.currentOdometerKm,
  };
}

export async function getHistoryPageData(locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const records = await listAllRecordsForOwner(ownerUserId, locale);
  return { records };
}

export async function getVehicleMaintenanceData(vehicleId: string, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId, deletedAt: null },
    select: { id: true, make: true, model: true, currentOdometerKm: true },
  });
  if (!vehicle) return null;

  const [templates, schedules] = await Promise.all([
    listMaintenanceTemplates(),
    listSchedulesForVehicle(vehicleId),
  ]);

  return {
    vehicle,
    templates,
    schedules: schedules.map((s) => serializeSchedule(s, locale)),
  };
}

export async function seedDefaultSchedulesForVehicle(vehicleId: string) {
  const existing = await prisma.vehicleMaintenanceSchedule.count({
    where: { vehicleId },
  });
  if (existing > 0) return;

  const templates = await listMaintenanceTemplates();
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { currentOdometerKm: true },
  });
  if (!vehicle) return;

  const defaultSlugs = [
    "oil_change",
    "air_filter",
    "cabin_filter",
    "brake_fluid",
    "hu_inspection",
    "fuel_additive",
    "tire_rotation",
  ];

  for (const slug of defaultSlugs) {
    const template = templates.find((t) => t.slug === slug);
    if (!template) continue;

    const computed = computeNextDue(
      {
        intervalKm: template.defaultIntervalKm,
        intervalMonths: template.defaultIntervalMonths,
      },
      { performedAt: null, odometerKm: null },
      vehicle.currentOdometerKm,
    );

    await prisma.vehicleMaintenanceSchedule.create({
      data: {
        vehicleId,
        templateId: template.id,
        category: template.category,
        intervalKm: template.defaultIntervalKm,
        intervalMonths: template.defaultIntervalMonths,
        estimatedCostCents:
          template.defaultCostCentsMin != null
            ? template.defaultCostCentsMin
            : undefined,
        nextDueAt: computed.nextDueAt,
        nextDueOdometerKm: computed.nextDueOdometerKm,
        dueStatus: computed.dueStatus,
      },
    });
  }
}

export async function createMaintenanceSchedule(input: CreateScheduleInput) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, ownerUserId, deletedAt: null },
  });
  if (!vehicle) throw new Error("Vehicle not found");

  let template = null;
  if (input.templateId) {
    template = await prisma.maintenanceTemplate.findUnique({
      where: { id: input.templateId },
    });
  }

  const intervalKm =
    input.intervalKm ?? template?.defaultIntervalKm ?? null;
  const intervalMonths =
    input.intervalMonths ?? template?.defaultIntervalMonths ?? null;

  const lastPerformedAt = input.lastPerformedAt
    ? new Date(input.lastPerformedAt)
    : null;

  const computed = computeNextDue(
    { intervalKm, intervalMonths },
    {
      performedAt: lastPerformedAt,
      odometerKm: input.lastOdometerKm ?? null,
    },
    vehicle.currentOdometerKm,
  );

  const schedule = await prisma.vehicleMaintenanceSchedule.create({
    data: {
      vehicleId: input.vehicleId,
      templateId: template?.id,
      customName: input.customName?.trim() || null,
      category:
        (input.category as MaintenanceCategory | undefined) ??
        template?.category ??
        "OTHER",
      intervalKm,
      intervalMonths,
      lastPerformedAt,
      lastOdometerKm: input.lastOdometerKm ?? null,
      estimatedCostCents:
        input.estimatedCostCents != null
          ? BigInt(input.estimatedCostCents)
          : template?.defaultCostCentsMin ?? undefined,
      currency: input.currency ?? vehicle.purchaseCurrency ?? "EUR",
      notes: input.notes?.trim() || null,
      nextDueAt: computed.nextDueAt,
      nextDueOdometerKm: computed.nextDueOdometerKm,
      dueStatus: computed.dueStatus,
    },
  });

  return schedule.id;
}

export async function updateMaintenanceSchedule(input: UpdateScheduleInput) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(input.scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  const intervalKm =
    input.intervalKm !== undefined ? input.intervalKm : schedule.intervalKm;
  const intervalMonths =
    input.intervalMonths !== undefined
      ? input.intervalMonths
      : schedule.intervalMonths;

  const lastPerformedAt =
    input.lastPerformedAt !== undefined
      ? input.lastPerformedAt
        ? new Date(input.lastPerformedAt)
        : null
      : schedule.lastPerformedAt;

  const lastOdometerKm =
    input.lastOdometerKm !== undefined
      ? input.lastOdometerKm
      : schedule.lastOdometerKm;

  const computed = computeNextDue(
    { intervalKm, intervalMonths },
    { performedAt: lastPerformedAt, odometerKm: lastOdometerKm },
    schedule.vehicle.currentOdometerKm,
  );

  await prisma.vehicleMaintenanceSchedule.update({
    where: { id: input.scheduleId },
    data: {
      customName: input.customName?.trim() || schedule.customName,
      category: (input.category as MaintenanceCategory | undefined) ?? schedule.category,
      intervalKm,
      intervalMonths,
      lastPerformedAt,
      lastOdometerKm,
      estimatedCostCents:
        input.estimatedCostCents != null
          ? BigInt(input.estimatedCostCents)
          : schedule.estimatedCostCents,
      currency: input.currency ?? schedule.currency,
      notes: input.notes !== undefined ? input.notes?.trim() || null : schedule.notes,
      isActive: input.isActive ?? schedule.isActive,
      nextDueAt: computed.nextDueAt,
      nextDueOdometerKm: computed.nextDueOdometerKm,
      dueStatus: computed.dueStatus,
    },
  });
}

export async function logMaintenanceService(input: LogMaintenanceInput) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(input.scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  const performedAt = new Date(input.performedAt);
  const odometerKm = input.odometerKm ?? schedule.vehicle.currentOdometerKm;
  const costCents = input.costCents ?? 0;

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenanceRecord.create({
      data: {
        vehicleId: schedule.vehicleId,
        scheduleId: schedule.id,
        performedAt,
        odometerKm,
        costCents: BigInt(costCents),
        currency: input.currency ?? schedule.currency,
        vendorName: input.vendorName?.trim() || null,
        title: schedule.customName ?? schedule.template?.nameEn ?? "Maintenance",
        note: input.note?.trim() || null,
        createdByUserId: ownerUserId,
      },
    });

    await tx.vehicleMaintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        lastPerformedAt: performedAt,
        lastOdometerKm: odometerKm,
      },
    });

    if (odometerKm > schedule.vehicle.currentOdometerKm) {
      await tx.vehicle.update({
        where: { id: schedule.vehicleId },
        data: { currentOdometerKm: odometerKm },
      });
    }

    return created;
  });

  await refreshScheduleDueStatus(prisma, schedule.id);

  if (costCents > 0) {
    const { createExpenseFromMaintenance } = await import("@/lib/services/expenses");
    await createExpenseFromMaintenance({
      vehicleId: schedule.vehicleId,
      occurredAt: performedAt,
      amountCents: costCents,
      currency: input.currency ?? schedule.currency,
      odometerKm,
      maintenanceRecordId: record.id,
      description: schedule.customName ?? schedule.template?.nameEn ?? "Maintenance",
    });
  }

  const { notifyMaintenanceLogged } = await import("@/lib/services/notifications");
  void notifyMaintenanceLogged(ownerUserId, {
    title: record.title ?? "Maintenance",
    vehicleLabel:
      [schedule.vehicle.make, schedule.vehicle.model].filter(Boolean).join(" ") ||
      schedule.vehicle.licensePlate ||
      "Vehicle",
    performedAt,
    costCents,
    currency: input.currency ?? schedule.currency,
  });

  return record.id;
}

export async function deleteMaintenanceSchedule(scheduleId: string) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  await prisma.vehicleMaintenanceSchedule.update({
    where: { id: scheduleId },
    data: { isActive: false },
  });
}

export async function bootstrapSchedulesForOwner(ownerUserId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerUserId, deletedAt: null },
    select: { id: true },
  });
  for (const vehicle of vehicles) {
    await seedDefaultSchedulesForVehicle(vehicle.id);
  }
}

export async function seedMaintenanceTemplates() {
  for (const seed of MAINTENANCE_TEMPLATE_SEEDS) {
    await prisma.maintenanceTemplate.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        category: seed.category,
        nameEn: seed.nameEn,
        nameDe: seed.nameDe,
        descriptionEn: seed.descriptionEn,
        descriptionDe: seed.descriptionDe,
        defaultIntervalKm: seed.defaultIntervalKm,
        defaultIntervalMonths: seed.defaultIntervalMonths,
        defaultCostCentsMin: BigInt(seed.defaultCostCentsMin),
        defaultCostCentsMax: BigInt(seed.defaultCostCentsMax),
        sortOrder: seed.sortOrder,
      },
      update: {
        category: seed.category,
        nameEn: seed.nameEn,
        nameDe: seed.nameDe,
        descriptionEn: seed.descriptionEn,
        descriptionDe: seed.descriptionDe,
        defaultIntervalKm: seed.defaultIntervalKm,
        defaultIntervalMonths: seed.defaultIntervalMonths,
        defaultCostCentsMin: BigInt(seed.defaultCostCentsMin),
        defaultCostCentsMax: BigInt(seed.defaultCostCentsMax),
        sortOrder: seed.sortOrder,
      },
    });
  }
}

export {
  getUpcomingSchedulesForOwner,
  countDueSchedulesForOwner,
};
