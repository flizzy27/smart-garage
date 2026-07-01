import { prisma } from "@/lib/prisma";
import type { UserSettings } from "@/lib/settings/types";
import {
  DEFAULT_SETTINGS,
  clampMaintenanceDueSoonDays,
  clampMaintenanceDueSoonKm,
} from "@/lib/settings/types";
import type { Locale } from "@/lib/i18n/routing";
import type { ThemeMode, CurrencyCode } from "@/lib/settings/types";
import type { DesignPresetId } from "@/lib/theme/presets";
import { clampBackgroundBlur } from "@/lib/theme/presets";
import {
  DEFAULT_MAINTENANCE_THRESHOLDS,
  type MaintenanceThresholds,
} from "@/lib/maintenance/scheduler";

export type AppearancePreferences = {
  designPreset: DesignPresetId;
  backgroundBlurPx: number;
  hasBackground: boolean;
};

export async function findPreferencesForUser(userId: string): Promise<UserSettings> {
  const row = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!row) return DEFAULT_SETTINGS;

  return {
    theme: row.theme as ThemeMode,
    locale: row.locale as Locale,
    timezone: row.timezone,
    currency: row.currency as CurrencyCode,
    designPreset: (row.designPreset as DesignPresetId) ?? DEFAULT_SETTINGS.designPreset,
    backgroundBlurPx: clampBackgroundBlur(row.backgroundBlurPx ?? DEFAULT_SETTINGS.backgroundBlurPx),
    maintenanceDueSoonKm: clampMaintenanceDueSoonKm(
      row.maintenanceDueSoonKm ?? DEFAULT_SETTINGS.maintenanceDueSoonKm,
    ),
    maintenanceDueSoonDays: clampMaintenanceDueSoonDays(
      row.maintenanceDueSoonDays ?? DEFAULT_SETTINGS.maintenanceDueSoonDays,
    ),
  };
}

/**
 * Lightweight read of just the maintenance warning thresholds for a user.
 * Falls back to the built-in defaults when no preferences row exists.
 */
export async function getMaintenanceThresholds(
  userId: string,
): Promise<MaintenanceThresholds> {
  const row = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { maintenanceDueSoonKm: true, maintenanceDueSoonDays: true },
  });
  if (!row) return DEFAULT_MAINTENANCE_THRESHOLDS;
  return {
    dueSoonKm: clampMaintenanceDueSoonKm(
      row.maintenanceDueSoonKm ?? DEFAULT_MAINTENANCE_THRESHOLDS.dueSoonKm,
    ),
    dueSoonDays: clampMaintenanceDueSoonDays(
      row.maintenanceDueSoonDays ?? DEFAULT_MAINTENANCE_THRESHOLDS.dueSoonDays,
    ),
  };
}

export async function findAppearanceForUser(userId: string): Promise<AppearancePreferences> {
  const row = await prisma.userPreferences.findUnique({
    where: { userId },
    select: {
      designPreset: true,
      backgroundBlurPx: true,
      backgroundImageKey: true,
    },
  });

  return {
    designPreset: (row?.designPreset as DesignPresetId) ?? DEFAULT_SETTINGS.designPreset,
    backgroundBlurPx: clampBackgroundBlur(row?.backgroundBlurPx ?? DEFAULT_SETTINGS.backgroundBlurPx),
    hasBackground: Boolean(row?.backgroundImageKey),
  };
}

export async function upsertPreferencesForUser(
  userId: string,
  settings: UserSettings,
) {
  const maintenanceDueSoonKm = clampMaintenanceDueSoonKm(settings.maintenanceDueSoonKm);
  const maintenanceDueSoonDays = clampMaintenanceDueSoonDays(
    settings.maintenanceDueSoonDays,
  );

  return prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      theme: settings.theme,
      locale: settings.locale,
      timezone: settings.timezone,
      currency: settings.currency,
      designPreset: settings.designPreset,
      backgroundBlurPx: clampBackgroundBlur(settings.backgroundBlurPx),
      maintenanceDueSoonKm,
      maintenanceDueSoonDays,
    },
    update: {
      theme: settings.theme,
      locale: settings.locale,
      timezone: settings.timezone,
      currency: settings.currency,
      designPreset: settings.designPreset,
      backgroundBlurPx: clampBackgroundBlur(settings.backgroundBlurPx),
      maintenanceDueSoonKm,
      maintenanceDueSoonDays,
    },
  });
}

export async function updateAppearanceForUser(
  userId: string,
  data: Partial<Pick<UserSettings, "designPreset" | "backgroundBlurPx">>,
) {
  const existing = await prisma.userPreferences.findUnique({ where: { userId } });
  const create = {
    userId,
    designPreset: data.designPreset ?? DEFAULT_SETTINGS.designPreset,
    backgroundBlurPx: clampBackgroundBlur(
      data.backgroundBlurPx ?? DEFAULT_SETTINGS.backgroundBlurPx,
    ),
  };

  if (!existing) {
    return prisma.userPreferences.create({ data: create });
  }

  return prisma.userPreferences.update({
    where: { userId },
    data: {
      ...(data.designPreset != null ? { designPreset: data.designPreset } : {}),
      ...(data.backgroundBlurPx != null
        ? { backgroundBlurPx: clampBackgroundBlur(data.backgroundBlurPx) }
        : {}),
    },
  });
}
