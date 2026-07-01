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
import { getMaintenanceThresholds } from "@/lib/repositories/preferences";
import { maybeSendMaintenanceAlerts } from "@/lib/services/notifications";

export const getDashboardStats = cache(async () => {
  const ownerUserId = await getCurrentUserId();
  const locale = (await getLocale()) as Locale;

  const [primaryVehicle, expenses, dueSoonCount, upcomingMaintenance, thresholds] =
    await Promise.all([
      getPrimaryVehicleForOwner(ownerUserId),
      getMonthlyExpenseSummary(ownerUserId),
      countDueSchedulesForOwner(ownerUserId),
      getUpcomingSchedulesForOwner(ownerUserId, locale, 8),
      getMaintenanceThresholds(ownerUserId),
    ]);

  void maybeSendMaintenanceAlerts(ownerUserId, locale);

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
    expenses,
    dueSoonCount,
    upcomingMaintenance,
  };
});
