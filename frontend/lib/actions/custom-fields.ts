"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createCustomFieldForUser,
  deleteCustomFieldForUser,
  listCustomFieldsForUser,
  updateCustomFieldForUser,
} from "@/lib/repositories/custom-fields";
import {
  CUSTOM_FIELD_TYPES,
  MAX_CUSTOM_FIELDS_PER_USER,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  type CustomFieldType,
} from "@/lib/domain/custom-fields";

export type CustomFieldActionResult = {
  ok: boolean;
  error?: string;
};

function parseFieldType(value: FormDataEntryValue | null): CustomFieldType {
  return typeof value === "string" &&
    (CUSTOM_FIELD_TYPES as readonly string[]).includes(value)
    ? (value as CustomFieldType)
    : "TEXT";
}

function revalidateVehicleViews() {
  revalidatePath("/settings/vehicle-fields");
  revalidatePath("/vehicles");
}

export async function createCustomFieldAction(
  _prev: CustomFieldActionResult | null,
  formData: FormData,
): Promise<CustomFieldActionResult> {
  try {
    const userId = await getCurrentUserId();
    const label = String(formData.get("label") ?? "").trim();

    if (label.length === 0) return { ok: false, error: "labelRequired" };
    if (label.length > MAX_CUSTOM_FIELD_LABEL_LENGTH) {
      return { ok: false, error: "labelTooLong" };
    }

    const existing = await listCustomFieldsForUser(userId);
    if (existing.length >= MAX_CUSTOM_FIELDS_PER_USER) {
      return { ok: false, error: "tooManyFields" };
    }

    await createCustomFieldForUser(userId, {
      label,
      fieldType: parseFieldType(formData.get("fieldType")),
      unit: String(formData.get("unit") ?? ""),
    });

    revalidateVehicleViews();
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function updateCustomFieldAction(
  _prev: CustomFieldActionResult | null,
  formData: FormData,
): Promise<CustomFieldActionResult> {
  try {
    const userId = await getCurrentUserId();
    const fieldId = String(formData.get("fieldId") ?? "");
    const label = String(formData.get("label") ?? "").trim();

    if (label.length === 0) return { ok: false, error: "labelRequired" };
    if (label.length > MAX_CUSTOM_FIELD_LABEL_LENGTH) {
      return { ok: false, error: "labelTooLong" };
    }

    const updated = await updateCustomFieldForUser(userId, fieldId, {
      label,
      fieldType: parseFieldType(formData.get("fieldType")),
      unit: String(formData.get("unit") ?? ""),
    });
    if (!updated) return { ok: false, error: "notFound" };

    revalidateVehicleViews();
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function deleteCustomFieldAction(
  _prev: CustomFieldActionResult | null,
  formData: FormData,
): Promise<CustomFieldActionResult> {
  try {
    const userId = await getCurrentUserId();
    const fieldId = String(formData.get("fieldId") ?? "");

    const deleted = await deleteCustomFieldForUser(userId, fieldId);
    if (!deleted) return { ok: false, error: "notFound" };

    revalidateVehicleViews();
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}
