"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import {
  loginUser,
  logoutUser,
  registerUser,
  setUserActive,
  createUserByAdmin,
} from "@/lib/services/auth";
import { requireAdmin } from "@/lib/auth/current-user";

export type AuthActionResult = {
  ok: boolean;
  error?: string;
};

function mapAuthError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "INVALID_USERNAME") return "invalidUsername";
    if (error.message === "PASSWORD_TOO_SHORT") return "passwordTooShort";
    if (error.message === "USERNAME_TAKEN") return "usernameTaken";
    if (error.message === "INVALID_CREDENTIALS") return "invalidCredentials";
  }
  return "failed";
}

export async function loginAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    await loginUser({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      rememberMe: formData.get("rememberMe") === "on",
    });
    const locale = await getLocale();
    redirect(`/${locale}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function registerAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    await registerUser({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    });
    const locale = await getLocale();
    redirect(`/${locale}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function logoutAction() {
  await logoutUser();
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}

export async function toggleUserActiveAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    await requireAdmin();
    const userId = String(formData.get("userId") ?? "");
    const isActive = formData.get("isActive") === "true";
    await setUserActive(userId, isActive);
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function createUserAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    await requireAdmin();
    await createUserByAdmin({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}
