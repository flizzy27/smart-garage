import type { WishlistCategory, WishlistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WishlistItemInput = {
  title: string;
  description?: string | null;
  category?: WishlistCategory;
  status?: WishlistStatus;
  priority?: number;
  targetDate?: Date | null;
  url?: string | null;
  estimatedCostCents?: bigint | null;
  currency?: string;
  vehicleId?: string | null;
  plannedMake?: string | null;
  plannedModel?: string | null;
  plannedYear?: number | null;
  plannedBudgetCents?: bigint | null;
};

export async function listWishlistItems(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function createWishlistItem(userId: string, data: WishlistItemInput) {
  return prisma.wishlistItem.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category ?? "OTHER",
      status: data.status ?? "IDEA",
      priority: data.priority ?? 0,
      targetDate: data.targetDate ?? null,
      url: data.url?.trim() || null,
      estimatedCostCents: data.estimatedCostCents ?? null,
      currency: data.currency ?? "EUR",
      vehicleId: data.vehicleId ?? null,
      plannedMake: data.plannedMake?.trim() || null,
      plannedModel: data.plannedModel?.trim() || null,
      plannedYear: data.plannedYear ?? null,
      plannedBudgetCents: data.plannedBudgetCents ?? null,
    },
  });
}

export async function updateWishlistItem(
  id: string,
  userId: string,
  data: Partial<WishlistItemInput>,
) {
  return prisma.wishlistItem.updateMany({
    where: { id, userId },
    data: {
      ...(data.title != null ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.category != null ? { category: data.category } : {}),
      ...(data.status != null ? { status: data.status } : {}),
      ...(data.priority != null ? { priority: data.priority } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
      ...(data.url !== undefined ? { url: data.url?.trim() || null } : {}),
      ...(data.estimatedCostCents !== undefined
        ? { estimatedCostCents: data.estimatedCostCents }
        : {}),
      ...(data.plannedMake !== undefined
        ? { plannedMake: data.plannedMake?.trim() || null }
        : {}),
      ...(data.plannedModel !== undefined
        ? { plannedModel: data.plannedModel?.trim() || null }
        : {}),
      ...(data.plannedYear !== undefined ? { plannedYear: data.plannedYear } : {}),
      ...(data.plannedBudgetCents !== undefined
        ? { plannedBudgetCents: data.plannedBudgetCents }
        : {}),
    },
  });
}

export async function deleteWishlistItem(id: string, userId: string) {
  return prisma.wishlistItem.deleteMany({ where: { id, userId } });
}
