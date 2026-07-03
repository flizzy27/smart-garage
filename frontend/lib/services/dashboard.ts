import { cache } from "react";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  getMonthlyExpenseSummary,
  getPrimaryVehicleForOwner,
} from "@/lib/repositories/dashboard";
import {
  countDueSchedulesForOwner,
  getUpcomingSchedulesForOwner,
} from "@/lib/repositories/maintenance";
import { computeNextDue } from "@/lib/maintenance/scheduler";
import { scheduleDisplayName } from "@/lib/maintenance/display";
import {
  findPreferencesForUser,
  getMaintenanceThresholds,
} from "@/lib/repositories/preferences";
import { prisma } from "@/lib/prisma";

export const getDashboardStats = cache(async () => {
  const ownerUserId = await getCurrentUserId();
  const locale = (await getLocale()) as Locale;

  const [
    primaryVehicle,
    rawExpenses,
    dueSoonCount,
    upcomingMaintenance,
    thresholds,
    preferences,
    recentFuel,
  ] =
    await Promise.all([
      getPrimaryVehicleForOwner(ownerUserId),
      getMonthlyExpenseSummary(ownerUserId),
      countDueSchedulesForOwner(ownerUserId),
      getUpcomingSchedulesForOwner(ownerUserId, locale, 8),
      getMaintenanceThresholds(ownerUserId),
      findPreferencesForUser(ownerUserId),
      prisma.fuelEntry.findMany({
        where: { vehicle: { ownerUserId, deletedAt: null } },
        include: {
          vehicle: {
            select: { make: true, model: true, licensePlate: true },
          },
        },
        orderBy: [{ filledAt: "desc" }],
        take: 3,
      }),
    ]);

  const [nextInspection, currentInsurance] = primaryVehicle
    ? await Promise.all([
        prisma.vehicleInspection.findFirst({
          where: { vehicleId: primaryVehicle.id },
          orderBy: { nextDueAt: "asc" },
        }),
        prisma.insurancePolicy.findFirst({
          where: { vehicleId: primaryVehicle.id },
          orderBy: { endDate: "desc" },
        }),
      ])
    : [null, null];

  const vehicleAlerts =
    primaryVehicle?.maintenanceSchedules.map((schedule) => {
      const computed = computeNextDue(
        {
          intervalKm: schedule.intervalKm,
          intervalMonths: schedule.intervalMonths,
        },
        {
          performedAt: schedule.lastPerformedAt,
          odometerKm: schedule.lastOdometerKm,
        },
        primaryVehicle.currentOdometerKm,
        new Date(),
        thresholds,
      );

      return {
        id: schedule.id,
        name: scheduleDisplayName(schedule, locale),
        dueStatus: computed.dueStatus,
        dueInDays: computed.dueInDays,
        dueInKm: computed.dueInKm,
      };
    }) ?? [];

  return {
    primaryVehicle,
    vehicleAlerts,
    expenses: { ...rawExpenses, currency: preferences.currency },
    dueSoonCount,
    upcomingMaintenance,
    nextInspection,
    currentInsurance,
    recentFuel: recentFuel.map((entry) => ({
      id: entry.id,
      vehicleName:
        [entry.vehicle.make, entry.vehicle.model].filter(Boolean).join(" ") ||
        entry.vehicle.licensePlate ||
        "Vehicle",
      filledAt: entry.filledAt.toISOString(),
      liters: entry.liters,
      totalCostCents: Number(entry.totalCostCents),
      currency: entry.currency,
    })),
    preferences,
  };
});
