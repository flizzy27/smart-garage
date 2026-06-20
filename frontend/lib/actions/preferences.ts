"use server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { upsertPreferencesForUser } from "@/lib/repositories/preferences";
import type { UserSettings } from "@/lib/settings/types";

export async function saveUserPreferences(settings: UserSettings) {
  const userId = await getCurrentUserId();
  await upsertPreferencesForUser(userId, settings);
}
