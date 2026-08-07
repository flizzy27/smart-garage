import {
  APP_SETTING_KEYS,
  getAppSetting,
  setAppSetting,
} from "@/lib/repositories/app-settings";
import { requireAdmin } from "@/lib/auth/current-user";

/**
 * Where the Tankerkönig API key comes from.
 *
 * Two sources, on purpose. The environment variable suits people who configure
 * everything in the Unraid template, while the in-app field means a key that
 * arrives by email days after signup can be pasted in without editing the
 * container and restarting it. The in-app value wins so that changing it takes
 * effect immediately — the environment variable is the fallback, not an
 * override nobody can see.
 */

export type FuelPriceKeySource = "app" | "env" | null;

export type FuelPriceConfig = {
  apiKey: string | null;
  source: FuelPriceKeySource;
  /** Whether an environment variable is present, for the settings hint. */
  hasEnvKey: boolean;
};

function envKey(): string | null {
  const value = process.env.TANKERKOENIG_API_KEY;
  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function getFuelPriceConfig(): Promise<FuelPriceConfig> {
  const fromEnv = envKey();

  let fromApp: string | null = null;
  try {
    fromApp = await getAppSetting(APP_SETTING_KEYS.tankerkoenigApiKey);
  } catch {
    // The settings table may not exist yet on a container that has not run the
    // migration. Falling back to the environment keeps the feature working
    // instead of breaking the page.
    fromApp = null;
  }

  if (fromApp) {
    return { apiKey: fromApp, source: "app", hasEnvKey: fromEnv !== null };
  }
  if (fromEnv) {
    return { apiKey: fromEnv, source: "env", hasEnvKey: true };
  }
  return { apiKey: null, source: null, hasEnvKey: false };
}

export async function isFuelPriceLookupConfigured(): Promise<boolean> {
  return (await getFuelPriceConfig()).apiKey !== null;
}

/**
 * A Tankerkönig key is a UUID. Checking the shape here turns the most common
 * paste mistake (a whole email line, or a truncated key) into an immediate,
 * understandable error instead of a failed lookup later.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeApiKey(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

/**
 * The key belongs to the whole installation, so only an admin may change it.
 * On a single-user install that is the account that registered first.
 */
export async function saveFuelPriceApiKey(value: string | null): Promise<void> {
  await requireAdmin();

  const trimmed = value?.trim() ?? "";
  if (trimmed !== "" && !looksLikeApiKey(trimmed)) {
    throw new Error("INVALID_API_KEY");
  }

  await setAppSetting(APP_SETTING_KEYS.tankerkoenigApiKey, trimmed || null);
}

/**
 * Shows enough of the stored key to recognise it, never enough to use it.
 * Mirrors how the notification credentials are presented.
 */
export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}
