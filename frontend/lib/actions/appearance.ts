"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { updateAppearanceForUser } from "@/lib/repositories/preferences";
import type { DesignPresetId } from "@/lib/theme/presets";
import { clampBackgroundBlur } from "@/lib/theme/presets";
import {
  removeBackgroundImage,
  uploadBackgroundImage,
} from "@/lib/services/appearance";

export type BackgroundActionResult = {
  ok: boolean;
  error?: string;
};

export async function saveAppearanceSettings(data: {
  designPreset?: DesignPresetId;
  backgroundBlurPx?: number;
}) {
  const userId = await getCurrentUserId();
  await updateAppearanceForUser(userId, {
    ...(data.designPreset != null ? { designPreset: data.designPreset } : {}),
    ...(data.backgroundBlurPx != null
      ? { backgroundBlurPx: clampBackgroundBlur(data.backgroundBlurPx) }
      : {}),
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

function mapError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "INVALID_FILE_TYPE") return "invalidFileType";
    if (error.message === "FILE_TOO_LARGE") return "fileTooLarge";
    if (error.message === "UNAUTHORIZED") return "unauthorized";
  }
  return "uploadFailed";
}

export async function uploadBackgroundAction(
  _prev: BackgroundActionResult | null,
  formData: FormData,
): Promise<BackgroundActionResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "noFile" };
    }

    await uploadBackgroundImage(file);
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function removeBackgroundAction(): Promise<BackgroundActionResult> {
  try {
    await removeBackgroundImage();
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function removeBackgroundFormAction(
  _prev: BackgroundActionResult | null,
  _formData: FormData,
): Promise<BackgroundActionResult> {
  return removeBackgroundAction();
}
