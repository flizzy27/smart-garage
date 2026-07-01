import type { MaintenanceItemCategory, MaintenanceItemUnit, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MaintenanceItemInput } from "@/lib/validations/maintenance-items";

export type SerializedMaintenanceItem = {
  id: string;
  category: MaintenanceItemCategory;
  name: string | null;
  brand: string | null;
  productName: string | null;
  partNumber: string | null;
  specification: string | null;
  quantity: number | null;
  unit: MaintenanceItemUnit | null;
  customUnit: string | null;
  costCents: number | null;
  currency: string | null;
  supplierName: string | null;
  notes: string | null;
  sortOrder: number;
};

type ItemRow = {
  id: string;
  category: MaintenanceItemCategory;
  name: string | null;
  brand: string | null;
  productName: string | null;
  partNumber: string | null;
  specification: string | null;
  quantity: number | null;
  unit: MaintenanceItemUnit | null;
  customUnit: string | null;
  costCents: bigint | null;
  currency: string | null;
  supplierName: string | null;
  notes: string | null;
  sortOrder: number;
};

export function serializeMaintenanceItem(row: ItemRow): SerializedMaintenanceItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    brand: row.brand,
    productName: row.productName,
    partNumber: row.partNumber,
    specification: row.specification,
    quantity: row.quantity,
    unit: row.unit,
    customUnit: row.customUnit,
    costCents: row.costCents != null ? Number(row.costCents) : null,
    currency: row.currency,
    supplierName: row.supplierName,
    notes: row.notes,
    sortOrder: row.sortOrder,
  };
}

function toCreateData(item: MaintenanceItemInput, sortOrder: number) {
  return {
    category: (item.category as MaintenanceItemCategory) ?? "OTHER",
    name: item.name?.trim() || null,
    brand: item.brand?.trim() || null,
    productName: item.productName?.trim() || null,
    partNumber: item.partNumber?.trim() || null,
    specification: item.specification?.trim() || null,
    quantity: item.quantity ?? null,
    unit: (item.unit as MaintenanceItemUnit | null) ?? null,
    customUnit: item.customUnit?.trim() || null,
    costCents: item.costCents != null ? BigInt(item.costCents) : null,
    currency: item.currency?.trim() || null,
    supplierName: item.supplierName?.trim() || null,
    notes: item.notes?.trim() || null,
    sortOrder,
  };
}

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function listItemsForRecord(recordId: string): Promise<SerializedMaintenanceItem[]> {
  const rows = await prisma.maintenanceItem.findMany({
    where: { recordId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serializeMaintenanceItem);
}

export async function listItemsForRecords(
  recordIds: string[],
): Promise<Map<string, SerializedMaintenanceItem[]>> {
  if (recordIds.length === 0) return new Map();
  const rows = await prisma.maintenanceItem.findMany({
    where: { recordId: { in: recordIds } },
    orderBy: { sortOrder: "asc" },
  });
  const map = new Map<string, SerializedMaintenanceItem[]>();
  for (const row of rows) {
    const list = map.get(row.recordId) ?? [];
    list.push(serializeMaintenanceItem(row));
    map.set(row.recordId, list);
  }
  return map;
}

export async function listDefaultsForSchedule(
  scheduleId: string,
): Promise<SerializedMaintenanceItem[]> {
  const rows = await prisma.maintenanceItemDefault.findMany({
    where: { scheduleId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serializeMaintenanceItem);
}

export async function createRecordItems(
  tx: TxClient,
  recordId: string,
  items: MaintenanceItemInput[],
) {
  if (items.length === 0) return;
  await tx.maintenanceItem.createMany({
    data: items.map((item, index) => ({
      recordId,
      ...toCreateData(item, index),
    })),
  });
}

export async function replaceRecordItems(
  tx: TxClient,
  recordId: string,
  items: MaintenanceItemInput[],
) {
  await tx.maintenanceItem.deleteMany({ where: { recordId } });
  await createRecordItems(tx, recordId, items);
}

export async function replaceScheduleDefaults(
  scheduleId: string,
  items: MaintenanceItemInput[],
) {
  await prisma.$transaction([
    prisma.maintenanceItemDefault.deleteMany({ where: { scheduleId } }),
    ...(items.length > 0
      ? [
          prisma.maintenanceItemDefault.createMany({
            data: items.map((item, index) => ({
              scheduleId,
              ...toCreateData(item, index),
            })),
          }),
        ]
      : []),
  ]);
}

export async function clearScheduleDefaults(scheduleId: string) {
  await prisma.maintenanceItemDefault.deleteMany({ where: { scheduleId } });
}

/** Convert stored defaults into the shape the item editor / Zod schema expects. */
export function defaultsToItemInputs(
  defaults: SerializedMaintenanceItem[],
): MaintenanceItemInput[] {
  return defaults.map((item) => ({
    category: item.category,
    name: item.name,
    brand: item.brand,
    productName: item.productName,
    partNumber: item.partNumber,
    specification: item.specification,
    quantity: item.quantity,
    unit: item.unit,
    customUnit: item.customUnit,
    costCents: item.costCents,
    currency: item.currency,
    supplierName: item.supplierName,
    notes: item.notes,
  }));
}
