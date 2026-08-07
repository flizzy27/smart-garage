import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";

/**
 * Instance-wide settings, stored as key/value rows.
 *
 * Deliberately tiny: this is for the handful of values that belong to the
 * installation rather than to a person, and that a self-hoster should be able
 * to change without editing the container and restarting it.
 */

export const APP_SETTING_KEYS = {
  tankerkoenigApiKey: "fuelPrices.tankerkoenigApiKey",
} as const;

export type AppSettingKey =
  (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

export async function getAppSetting(key: AppSettingKey): Promise<string | null> {
  const row = await withDbRetry(() =>
    prisma.appSetting.findUnique({ where: { key } }),
  );
  const value = row?.value?.trim();
  return value ? value : null;
}

/** Writing an empty value removes the row, so "clear the field" means "unset". */
export async function setAppSetting(
  key: AppSettingKey,
  value: string | null,
): Promise<void> {
  const trimmed = value?.trim() ?? "";

  await withDbRetry(async () => {
    if (trimmed === "") {
      await prisma.appSetting.deleteMany({ where: { key } });
      return;
    }
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: trimmed },
      update: { value: trimmed },
    });
  });
}
