"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import {
  createCustomFieldAction,
  deleteCustomFieldAction,
  updateCustomFieldAction,
  type CustomFieldActionResult,
} from "@/lib/actions/custom-fields";
import {
  CUSTOM_FIELD_TYPES,
  MAX_CUSTOM_FIELDS_PER_USER,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  type SerializedCustomField,
} from "@/lib/domain/custom-fields";

type Props = {
  fields: SerializedCustomField[];
};

/**
 * Manage user-defined vehicle fields (issue #7). Definitions live here; the
 * per-vehicle values are edited on the vehicle form itself.
 */
export function CustomFieldSettings({ fields }: Props) {
  const t = useTranslations("customFields");
  const [editing, setEditing] = useState<SerializedCustomField | null>(null);
  const [deleting, setDeleting] = useState<SerializedCustomField | null>(null);

  const [createState, createFormAction, creating] = useActionState<
    CustomFieldActionResult | null,
    FormData
  >(createCustomFieldAction, null);
  const [updateState, updateFormAction, updating] = useActionState<
    CustomFieldActionResult | null,
    FormData
  >(updateCustomFieldAction, null);
  const [deleteState, deleteFormAction, isDeleting] = useActionState<
    CustomFieldActionResult | null,
    FormData
  >(deleteCustomFieldAction, null);

  const atLimit = fields.length >= MAX_CUSTOM_FIELDS_PER_USER;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      {createState?.error ? (
        <Alert variant="error">{t(`errors.${createState.error}`)}</Alert>
      ) : null}
      {updateState?.error ? (
        <Alert variant="error">{t(`errors.${updateState.error}`)}</Alert>
      ) : null}
      {deleteState?.error ? (
        <Alert variant="error">{t(`errors.${deleteState.error}`)}</Alert>
      ) : null}

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {fields.map((field) => (
            <li
              key={field.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{field.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`types.${field.fieldType}`)}
                  {field.unit ? ` · ${field.unit}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => setEditing(field)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => setDeleting(field)}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={createFormAction}
        className="space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground">{t("addTitle")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="custom-field-label" required>
              {t("label")}
            </Label>
            <Input
              id="custom-field-label"
              name="label"
              required
              maxLength={MAX_CUSTOM_FIELD_LABEL_LENGTH}
              placeholder={t("labelPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-field-type">{t("type")}</Label>
            <Select id="custom-field-type" name="fieldType" defaultValue="TEXT">
              {CUSTOM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-field-unit">{t("unit")}</Label>
            <Input
              id="custom-field-unit"
              name="unit"
              maxLength={20}
              placeholder={t("unitPlaceholder")}
            />
          </div>
        </div>
        <Button type="submit" disabled={creating || atLimit}>
          {creating ? t("saving") : t("add")}
        </Button>
        {atLimit ? (
          <p className="text-xs text-muted-foreground">
            {t("limitReached", { max: MAX_CUSTOM_FIELDS_PER_USER })}
          </p>
        ) : null}
      </form>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("editTitle")}
        size="md"
      >
        {editing ? (
          <form
            id="edit-custom-field-form"
            action={(formData) => {
              updateFormAction(formData);
              setEditing(null);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="fieldId" value={editing.id} />
            <div className="space-y-2">
              <Label htmlFor="edit-custom-field-label" required>
                {t("label")}
              </Label>
              <Input
                id="edit-custom-field-label"
                name="label"
                required
                maxLength={MAX_CUSTOM_FIELD_LABEL_LENGTH}
                defaultValue={editing.label}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-custom-field-type">{t("type")}</Label>
              <Select
                id="edit-custom-field-type"
                name="fieldType"
                defaultValue={editing.fieldType}
              >
                {CUSTOM_FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-custom-field-unit">{t("unit")}</Label>
              <Input
                id="edit-custom-field-unit"
                name="unit"
                maxLength={20}
                defaultValue={editing.unit ?? ""}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={updating}>
                {t("save")}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Dialog
        open={deleting !== null}
        title={t("deleteTitle")}
        description={
          deleting ? t("deleteWarning", { label: deleting.label }) : undefined
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        confirmVariant="danger"
        loading={isDeleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const formData = new FormData();
          formData.set("fieldId", deleting.id);
          deleteFormAction(formData);
          setDeleting(null);
        }}
      />
    </div>
  );
}
