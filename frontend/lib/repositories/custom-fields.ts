import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldType,
  type SerializedCustomField,
} from "@/lib/domain/custom-fields";

function sanitizeFieldType(value: unknown): CustomFieldType {
  return typeof value === "string" &&
    (CUSTOM_FIELD_TYPES as readonly string[]).includes(value)
    ? (value as CustomFieldType)
    : "TEXT";
}

function serialize(row: {
  id: string;
  label: string;
  fieldType: string;
  unit: string | null;
  position: number;
}): SerializedCustomField {
  return {
    id: row.id,
    label: row.label,
    fieldType: sanitizeFieldType(row.fieldType),
    unit: row.unit,
    position: row.position,
  };
}

export async function listCustomFieldsForUser(
  userId: string,
): Promise<SerializedCustomField[]> {
  const rows = await prisma.vehicleCustomField.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, fieldType: true, unit: true, position: true },
  });
  return rows.map(serialize);
}

/** Field id → stored value for one vehicle. Missing entries mean "not filled in". */
export async function findCustomFieldValuesForVehicle(
  vehicleId: string,
): Promise<Record<string, string>> {
  const rows = await prisma.vehicleCustomFieldValue.findMany({
    where: { vehicleId },
    select: { fieldId: true, value: true },
  });
  return Object.fromEntries(rows.map((row) => [row.fieldId, row.value]));
}

export async function createCustomFieldForUser(
  userId: string,
  input: { label: string; fieldType: CustomFieldType; unit?: string | null },
) {
  const last = await prisma.vehicleCustomField.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return withDbRetry(() =>
    prisma.vehicleCustomField.create({
      data: {
        userId,
        label: input.label,
        fieldType: input.fieldType,
        unit: input.unit?.trim() || null,
        position: (last?.position ?? -1) + 1,
      },
    }),
  );
}

export async function updateCustomFieldForUser(
  userId: string,
  fieldId: string,
  input: { label: string; fieldType: CustomFieldType; unit?: string | null },
) {
  // Scoped by userId so one user can never rename another user's field.
  const updated = await withDbRetry(() =>
    prisma.vehicleCustomField.updateMany({
      where: { id: fieldId, userId },
      data: {
        label: input.label,
        fieldType: input.fieldType,
        unit: input.unit?.trim() || null,
      },
    }),
  );
  return updated.count > 0;
}

/** Deleting a definition also drops its values (FK cascade). */
export async function deleteCustomFieldForUser(userId: string, fieldId: string) {
  const deleted = await withDbRetry(() =>
    prisma.vehicleCustomField.deleteMany({ where: { id: fieldId, userId } }),
  );
  return deleted.count > 0;
}

/**
 * Writes the submitted values for one vehicle. An empty value removes the row
 * rather than storing "", so an unfilled field never shows up as a blank entry
 * in the detail view or the backup export.
 */
export async function saveCustomFieldValuesForVehicle(
  ownerUserId: string,
  vehicleId: string,
  values: Record<string, string>,
) {
  const fields = await prisma.vehicleCustomField.findMany({
    where: { userId: ownerUserId },
    select: { id: true },
  });
  const ownFieldIds = new Set(fields.map((field) => field.id));

  for (const [fieldId, rawValue] of Object.entries(values)) {
    if (!ownFieldIds.has(fieldId)) continue;
    const value = rawValue.trim();

    if (value.length === 0) {
      await withDbRetry(() =>
        prisma.vehicleCustomFieldValue.deleteMany({ where: { fieldId, vehicleId } }),
      );
      continue;
    }

    await withDbRetry(() =>
      prisma.vehicleCustomFieldValue.upsert({
        where: { fieldId_vehicleId: { fieldId, vehicleId } },
        create: { fieldId, vehicleId, value },
        update: { value },
      }),
    );
  }
}
