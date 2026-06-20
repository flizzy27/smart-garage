import { prisma } from "@/lib/prisma";
import type { UserSettings } from "@/lib/settings/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import type { Locale } from "@/lib/i18n/routing";
import type { ThemeMode, CurrencyCode } from "@/lib/settings/types";

export async function findPreferencesForUser(userId: string): Promise<UserSettings> {
  const row = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!row) return DEFAULT_SETTINGS;

  return {
    theme: row.theme as ThemeMode,
    locale: row.locale as Locale,
    timezone: row.timezone,
    currency: row.currency as CurrencyCode,
  };
}

export async function upsertPreferencesForUser(
  userId: string,
  settings: UserSettings,
) {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      theme: settings.theme,
      locale: settings.locale,
      timezone: settings.timezone,
      currency: settings.currency,
    },
    update: {
      theme: settings.theme,
      locale: settings.locale,
      timezone: settings.timezone,
      currency: settings.currency,
    },
  });
}
