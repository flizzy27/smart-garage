import { z } from "zod";
import { MAINTENANCE_ITEM_CATEGORIES, MAINTENANCE_ITEM_UNITS } from "@/lib/maintenance/item-categories";

export const maintenanceItemSchema = z.object({
  category: z.enum(MAINTENANCE_ITEM_CATEGORIES as [string, ...string[]]).default("OTHER"),
  name: z.string().trim().max(120).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  productName: z.string().trim().max(160).optional().nullable(),
  partNumber: z.string().trim().max(80).optional().nullable(),
  specification: z.string().trim().max(80).optional().nullable(),
  quantity: z.coerce.number().min(0).max(100000).optional().nullable(),
  unit: z.enum(MAINTENANCE_ITEM_UNITS as [string, ...string[]]).optional().nullable(),
  customUnit: z.string().trim().max(30).optional().nullable(),
  costCents: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  supplierName: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const maintenanceItemsArraySchema = z.array(maintenanceItemSchema).max(40);

export type MaintenanceItemInput = z.infer<typeof maintenanceItemSchema>;

/**
 * Items are submitted from the client as a single JSON string in a hidden
 * form field (rather than indexed FormData keys) — this keeps the dynamic
 * add/remove UI simple while still going through normal Zod validation.
 */
export function parseItemsJson(raw: FormDataEntryValue | null): MaintenanceItemInput[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid items payload");
  }
  return maintenanceItemsArraySchema.parse(parsed);
}

function isBlankItem(item: MaintenanceItemInput): boolean {
  return (
    !item.name?.trim() &&
    !item.brand?.trim() &&
    !item.productName?.trim() &&
    !item.partNumber?.trim() &&
    !item.specification?.trim() &&
    (item.quantity == null || item.quantity === 0) &&
    !item.supplierName?.trim() &&
    !item.notes?.trim() &&
    (item.costCents == null || item.costCents === 0)
  );
}

/** Drop fully-empty rows (e.g. an "Add item" row the user never filled in). */
export function dropBlankItems(items: MaintenanceItemInput[]): MaintenanceItemInput[] {
  return items.filter((item) => !isBlankItem(item));
}
