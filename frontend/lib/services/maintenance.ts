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
  refreshAllScheduleDueStatuses,
} from "@/lib/repositories/maintenance";
import {
  deleteMaintenanceRecord as deleteMaintenanceRecordRow,
  findRecordForOwner,
  listAllRecordsForOwner,
  listRecordsForSchedule,
  type HistoryFilters,
} from "@/lib/repositories/maintenance-records";
import {
  clearScheduleDefaults,
  createRecordItems,
  listDefaultsForSchedule,
  replaceRecordItems,
  replaceScheduleDefaults,
} from "@/lib/repositories/maintenance-items";
import { getMaintenanceThresholds } from "@/lib/repositories/preferences";
import type { Locale } from "@/lib/i18n/routing";
import type {
  CreateScheduleInput,
  LogMaintenanceInput,
  SaveScheduleDefaultsInput,
  SetupWarningInput,
  UpdateMaintenanceRecordInput,
  UpdateScheduleInput,
} from "@/lib/validations/maintenance";
import { dropBlankItems, type MaintenanceItemInput } from "@/lib/validations/maintenance-items";
import {
  circaLastPerformedDate,
  estimateLastService,
} from "@/lib/maintenance/setup-estimate";
import { prisma } from "@/lib/prisma";

export async function getMaintenancePageData(locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const thresholds = await getMaintenanceThresholds(ownerUserId);
  await refreshAllScheduleDueStatuses(ownerUserId, thresholds);
  const [templates, schedules] = await Promise.all([
    listMaintenanceTemplates(),
    listSchedulesForOwner(ownerUserId),
  ]);

  return {
    templates,
    schedules: sortSchedulesByPriority(
      schedules.map((s) => serializeSchedule(s, locale, thresholds)),
    ),
  };
}

/**
 * Orders schedules so the most urgent work surfaces first:
 * overdue → due soon → OK, then by soonest due (days, falling back to km).
 */
const DUE_STATUS_ORDER: Record<string, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  OK: 2,
};

function sortSchedulesByPriority<
  T extends { dueStatus: string; dueInDays: number | null; dueInKm: number | null },
>(schedules: T[]): T[] {
  return [...schedules].sort((a, b) => {
    const statusDiff =
      (DUE_STATUS_ORDER[a.dueStatus] ?? 3) - (DUE_STATUS_ORDER[b.dueStatus] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    const daysDiff = (a.dueInDays ?? Infinity) - (b.dueInDays ?? Infinity);
    if (daysDiff !== 0) return daysDiff;
    return (a.dueInKm ?? Infinity) - (b.dueInKm ?? Infinity);
  });
}

export async function getScheduleDetailData(scheduleId: string, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const thresholds = await getMaintenanceThresholds(ownerUserId);
  await refreshScheduleDueStatus(prisma, scheduleId, thresholds);
  const schedule = await findScheduleById(scheduleId, ownerUserId);
  if (!schedule) return null;

  const [records, itemDefaults] = await Promise.all([
    listRecordsForSchedule(scheduleId, ownerUserId, locale),
    listDefaultsForSchedule(scheduleId),
  ]);

  return {
    schedule: serializeSchedule(schedule, locale, thresholds),
    records,
    itemDefaults,
    currentOdometerKm: schedule.vehicle.currentOdometerKm,
  };
}

export async function getHistoryPageData(locale: Locale, filters: HistoryFilters = {}) {
  const ownerUserId = await getCurrentUserId();
  const [records, vehicles] = await Promise.all([
    listAllRecordsForOwner(ownerUserId, locale, 200, filters),
    prisma.vehicle.findMany({
      where: { ownerUserId, deletedAt: null },
      select: { id: true, make: true, model: true, licensePlate: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    records,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: [v.make, v.model].filter(Boolean).join(" ") || v.licensePlate || "Vehicle",
    })),
  };
}

export async function getVehicleMaintenanceData(vehicleId: string, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId, deletedAt: null },
    select: { id: true, make: true, model: true, currentOdometerKm: true },
  });
  if (!vehicle) return null;

  const thresholds = await getMaintenanceThresholds(ownerUserId);
  const [templates, schedules] = await Promise.all([
    listMaintenanceTemplates(),
    listSchedulesForVehicle(vehicleId),
  ]);

  return {
    vehicle,
    templates,
    schedules: sortSchedulesByPriority(
      schedules.map((s) => serializeSchedule(s, locale, thresholds)),
    ),
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

  const thresholds = await getMaintenanceThresholds(ownerUserId);
  const computed = computeNextDue(
    { intervalKm, intervalMonths },
    {
      performedAt: lastPerformedAt,
      odometerKm: input.lastOdometerKm ?? null,
    },
    vehicle.currentOdometerKm,
    new Date(),
    thresholds,
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

  const thresholds = await getMaintenanceThresholds(ownerUserId);
  const computed = computeNextDue(
    { intervalKm, intervalMonths },
    { performedAt: lastPerformedAt, odometerKm: lastOdometerKm },
    schedule.vehicle.currentOdometerKm,
    new Date(),
    thresholds,
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

export async function logMaintenanceService(
  input: LogMaintenanceInput,
  items: MaintenanceItemInput[] = [],
) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(input.scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  const performedAt = new Date(input.performedAt);
  const odometerKm = input.odometerKm ?? schedule.vehicle.currentOdometerKm;
  const costCents = input.costCents ?? 0;
  const cleanItems = dropBlankItems(items);

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

    await createRecordItems(tx, created.id, cleanItems);

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

  if (input.saveAsDefault) {
    await replaceScheduleDefaults(schedule.id, cleanItems);
  }

  await refreshScheduleDueStatus(
    prisma,
    schedule.id,
    await getMaintenanceThresholds(ownerUserId),
  );

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

export async function updateMaintenanceRecord(
  input: UpdateMaintenanceRecordInput,
  items: MaintenanceItemInput[] = [],
) {
  const ownerUserId = await getCurrentUserId();
  const record = await findRecordForOwner(input.recordId, ownerUserId);
  if (!record) throw new Error("Record not found");

  const performedAt = new Date(input.performedAt);
  const odometerKm = input.odometerKm ?? record.odometerKm ?? undefined;
  const costCents = input.costCents ?? Number(record.costCents);
  const cleanItems = dropBlankItems(items);

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRecord.update({
      where: { id: record.id },
      data: {
        performedAt,
        odometerKm: odometerKm ?? null,
        costCents: BigInt(costCents),
        currency: input.currency ?? record.currency,
        vendorName: input.vendorName?.trim() || null,
        note: input.note?.trim() || null,
      },
    });

    await replaceRecordItems(tx, record.id, cleanItems);
  });

  if (input.saveAsDefault && record.scheduleId) {
    await replaceScheduleDefaults(record.scheduleId, cleanItems);
  }

  if (record.scheduleId) {
    await refreshScheduleDueStatus(
      prisma,
      record.scheduleId,
      await getMaintenanceThresholds(ownerUserId),
    );
  }
}

export async function deleteMaintenanceRecordEntry(recordId: string) {
  const ownerUserId = await getCurrentUserId();
  const deleted = await deleteMaintenanceRecordRow(recordId, ownerUserId);
  if (!deleted) throw new Error("Record not found");

  if (deleted.scheduleId) {
    await refreshScheduleDueStatus(
      prisma,
      deleted.scheduleId,
      await getMaintenanceThresholds(ownerUserId),
    );
  }
}

export async function saveScheduleItemDefaults(input: SaveScheduleDefaultsInput) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(input.scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  const cleanItems = dropBlankItems(input.items as MaintenanceItemInput[]);
  await replaceScheduleDefaults(schedule.id, cleanItems);
}

export async function clearScheduleItemDefaults(scheduleId: string) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  await clearScheduleDefaults(schedule.id);
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

export async function applyWarningSetup(input: SetupWarningInput) {
  const ownerUserId = await getCurrentUserId();
  const schedule = await findScheduleById(input.scheduleId, ownerUserId);
  if (!schedule) throw new Error("Schedule not found");

  if (input.action === "skip") {
    await deleteMaintenanceSchedule(input.scheduleId);
    return;
  }

  const odometerKm = schedule.vehicle.currentOdometerKm;
  const interval = {
    intervalKm: schedule.intervalKm,
    intervalMonths: schedule.intervalMonths,
  };

  if (input.action === "done") {
    if (!input.performedAt) throw new Error("Date required");
    await logMaintenanceService({
      scheduleId: input.scheduleId,
      performedAt: input.performedAt,
      odometerKm,
      costCents: 0,
      currency: schedule.currency,
      note: "Quick setup",
    });
    return;
  }

  if (input.action === "circa") {
    if (!input.circaMonthsAgo) throw new Error("Approximate period required");
    const lastPerformedAt = circaLastPerformedDate(input.circaMonthsAgo);
    await updateMaintenanceSchedule({
      scheduleId: input.scheduleId,
      estimatedCostCents: undefined,
      lastPerformedAt: lastPerformedAt.toISOString().slice(0, 10),
      lastOdometerKm: odometerKm,
      notes: schedule.notes
        ? `${schedule.notes}\n(~${input.circaMonthsAgo} mo. ago, approximate)`
        : `(~${input.circaMonthsAgo} mo. ago, approximate)`,
    });
    return;
  }

  if (input.action === "unknown") {
    const estimate = estimateLastService(interval, odometerKm);
    await updateMaintenanceSchedule({
      scheduleId: input.scheduleId,
      estimatedCostCents: undefined,
      lastPerformedAt: estimate.lastPerformedAt
        ? estimate.lastPerformedAt.toISOString().slice(0, 10)
        : undefined,
      lastOdometerKm: estimate.lastOdometerKm ?? undefined,
      notes: schedule.notes
        ? `${schedule.notes}\n(Estimated — unsure of last service)`
        : "(Estimated — unsure of last service)",
    });
  }
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
