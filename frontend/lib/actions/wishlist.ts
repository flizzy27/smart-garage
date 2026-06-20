"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createWishlistItem,
  deleteWishlistItem,
  updateWishlistItem,
} from "@/lib/repositories/wishlist";
import type { WishlistCategory, WishlistStatus } from "@prisma/client";

export async function createWishlistAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { ok: false, error: "titleRequired" };

    const category = String(formData.get("category") ?? "OTHER") as WishlistCategory;
    const status = String(formData.get("status") ?? "IDEA") as WishlistStatus;
    const costRaw = String(formData.get("estimatedCostEuros") ?? "");
    const budgetRaw = String(formData.get("plannedBudgetEuros") ?? "");

    await createWishlistItem(userId, {
      title,
      description: String(formData.get("description") ?? "") || null,
      category,
      status,
      url: String(formData.get("url") ?? "") || null,
      plannedMake: String(formData.get("plannedMake") ?? "") || null,
      plannedModel: String(formData.get("plannedModel") ?? "") || null,
      plannedYear: formData.get("plannedYear")
        ? Number(formData.get("plannedYear"))
        : null,
      estimatedCostCents: costRaw
        ? BigInt(Math.round(Number(costRaw) * 100))
        : null,
      plannedBudgetCents: budgetRaw
        ? BigInt(Math.round(Number(budgetRaw) * 100))
        : null,
      targetDate: formData.get("targetDate")
        ? new Date(String(formData.get("targetDate")))
        : null,
    });

    revalidatePath("/wishlist");
    return { ok: true };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function updateWishlistStatusAction(
  id: string,
  status: WishlistStatus,
): Promise<{ ok: boolean }> {
  const userId = await getCurrentUserId();
  await updateWishlistItem(id, userId, { status });
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function deleteWishlistAction(id: string): Promise<{ ok: boolean }> {
  const userId = await getCurrentUserId();
  await deleteWishlistItem(id, userId);
  revalidatePath("/wishlist");
  return { ok: true };
}
