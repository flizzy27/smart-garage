"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  customFieldInputName,
  MAX_CUSTOM_FIELD_VALUE_LENGTH,
  type SerializedCustomField,
} from "@/lib/domain/custom-fields";
import { useTranslations } from "next-intl";

type Props = {
  field: SerializedCustomField;
  value: string;
};

/**
 * Renders one user-defined vehicle field (issue #7). The value is always
 * submitted as a string under `customField:<id>`; the type only picks the
 * input control, so switching a field's type never invalidates stored values.
 */
export function CustomFieldInput({ field, value }: Props) {
  const t = useTranslations("customFields");
  const name = customFieldInputName(field.id);
  const inputId = `custom-field-${field.id}`;
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;

  if (field.fieldType === "BOOLEAN") {
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{field.label}</Label>
        <Select id={inputId} name={name} defaultValue={value || ""}>
          <option value="">{t("notSet")}</option>
          <option value="true">{t("yes")}</option>
          <option value="false">{t("no")}</option>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        type={
          field.fieldType === "NUMBER"
            ? "number"
            : field.fieldType === "DATE"
              ? "date"
              : "text"
        }
        step={field.fieldType === "NUMBER" ? "any" : undefined}
        maxLength={
          field.fieldType === "TEXT" ? MAX_CUSTOM_FIELD_VALUE_LENGTH : undefined
        }
        defaultValue={value}
      />
    </div>
  );
}
