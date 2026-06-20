"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import {
  createMaintenanceSchedule,
  deleteMaintenanceSchedule,
  logMaintenanceService,
  applyWarningSetup,
  updateMaintenanceSchedule,
} from "@/lib/services/maintenance";
import {
  createScheduleSchema,
  logMaintenanceSchema,
  setupWarningSchema,
  updateScheduleSchema,
  type SetupWarningInput,
} from "@/lib/validations/maintenance";

export type MaintenanceActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateMaintenancePaths(vehicleId?: string, scheduleId?: string) {
  revalidatePath("/");
  revalidatePath("/maintenance");
  revalidatePath("/reminders");
  revalidatePath("/history");
  if (scheduleId) {
    revalidatePath(`/maintenance/${scheduleId}`);
  }
  if (vehicleId) {
    revalidatePath(`/vehicles/${vehicleId}`);
  }
}

export async function createScheduleAction(
  _prev: MaintenanceActionResult | null,
  formData: FormData,
): Promise<MaintenanceActionResult> {
  try {
    const parsed = createScheduleSchema.parse({
      vehicleId: formData.get("vehicleId"),
      templateId: formData.get("templateId") || undefined,
      customName: formData.get("customName") || undefined,
      category: formData.get("category") || undefined,
      intervalKm: formData.get("intervalKm") || undefined,
      intervalMonths: formData.get("intervalMonths") || undefined,
      estimatedCostCents: formData.get("estimatedCostEuros") || undefined,
      currency: formData.get("currency") || undefined,
      notes: formData.get("notes") || undefined,
      lastPerformedAt: formData.get("lastPerformedAt") || undefined,
      lastOdometerKm: formData.get("lastOdometerKm") || undefined,
    });

    await createMaintenanceSchedule(parsed);
    revalidateMaintenancePaths(parsed.vehicleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create schedule",
    };
  }
}

export async function updateScheduleAction(
  _prev: MaintenanceActionResult | null,
  formData: FormData,
): Promise<MaintenanceActionResult> {
  try {
    const parsed = updateScheduleSchema.parse({
      scheduleId: formData.get("scheduleId"),
      customName: formData.get("customName") || undefined,
      category: formData.get("category") || undefined,
      intervalKm: formData.get("intervalKm") || undefined,
      intervalMonths: formData.get("intervalMonths") || undefined,
      estimatedCostCents: formData.get("estimatedCostEuros") || undefined,
      currency: formData.get("currency") || undefined,
      notes: formData.get("notes") || undefined,
      lastPerformedAt: formData.get("lastPerformedAt") || undefined,
      lastOdometerKm: formData.get("lastOdometerKm") || undefined,
      isActive: formData.get("isActive") === "true" ? true : undefined,
    });

    const schedule = await updateMaintenanceSchedule(parsed);
    void schedule;
    revalidateMaintenancePaths(
      formData.get("vehicleId")?.toString(),
      parsed.scheduleId,
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update schedule",
    };
  }
}

export async function logMaintenanceAction(
  _prev: MaintenanceActionResult | null,
  formData: FormData,
): Promise<MaintenanceActionResult> {
  try {
    const parsed = logMaintenanceSchema.parse({
      scheduleId: formData.get("scheduleId"),
      performedAt: formData.get("performedAt"),
      odometerKm: formData.get("odometerKm") || undefined,
      costCents: formData.get("costEuros") || undefined,
      currency: formData.get("currency") || undefined,
      vendorName: formData.get("vendorName") || undefined,
      note: formData.get("note") || undefined,
    });

    await logMaintenanceService(parsed);
    revalidateMaintenancePaths(
      formData.get("vehicleId")?.toString(),
      parsed.scheduleId,
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to log service",
    };
  }
}

export async function deleteScheduleAction(scheduleId: string, vehicleId: string) {
  try {
    await deleteMaintenanceSchedule(scheduleId);
    revalidateMaintenancePaths(vehicleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}

export async function getActionLocale(): Promise<Locale> {
  return (await getLocale()) as Locale;
}

export async function setupWarningAction(
  input: SetupWarningInput,
): Promise<MaintenanceActionResult> {
  try {
    const parsed = setupWarningSchema.parse(input);
    await applyWarningSetup(parsed);
    revalidateMaintenancePaths(parsed.vehicleId, parsed.scheduleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Setup failed",
    };
  }
}
