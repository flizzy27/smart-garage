/**
 * User-defined vehicle fields (issue #7).
 *
 * Values are stored as text regardless of type — the type only drives the input
 * control and how the value is rendered. That keeps changing a field's type a
 * safe, non-destructive operation: nothing is parsed or rewritten on save.
 */
export const CUSTOM_FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "BOOLEAN"] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type SerializedCustomField = {
  id: string;
  label: string;
  fieldType: CustomFieldType;
  unit: string | null;
  position: number;
};

export const MAX_CUSTOM_FIELDS_PER_USER = 30;
export const MAX_CUSTOM_FIELD_LABEL_LENGTH = 60;
export const MAX_CUSTOM_FIELD_VALUE_LENGTH = 500;

/** Form field name used to submit a custom field's value with the vehicle form. */
export function customFieldInputName(fieldId: string): string {
  return `customField:${fieldId}`;
}

/** Extracts submitted custom-field values from a vehicle form submission. */
export function readCustomFieldValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("customField:")) continue;
    if (typeof value !== "string") continue;
    values[key.slice("customField:".length)] = value.slice(
      0,
      MAX_CUSTOM_FIELD_VALUE_LENGTH,
    );
  }
  return values;
}

/** Human-readable value for detail views and exports. */
export function formatCustomFieldValue(
  field: SerializedCustomField,
  value: string,
  locale: string,
  booleanLabels: { yes: string; no: string },
): string {
  if (field.fieldType === "BOOLEAN") {
    return value === "true" ? booleanLabels.yes : booleanLabels.no;
  }

  if (field.fieldType === "DATE") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale).format(parsed);
  }

  if (field.fieldType === "NUMBER") {
    const parsed = Number(value);
    const text = Number.isFinite(parsed)
      ? new Intl.NumberFormat(locale).format(parsed)
      : value;
    return field.unit ? `${text} ${field.unit}` : text;
  }

  return field.unit ? `${value} ${field.unit}` : value;
}
