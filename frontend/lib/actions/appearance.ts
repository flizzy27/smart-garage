"use server";

import { revalidatePath } from "next/cache";
import {
  removeBackgroundImage,
  uploadBackgroundImage,
} from "@/lib/services/appearance";

export type BackgroundActionResult = {
  ok: boolean;
  error?: string;
};

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
