"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import { useRouter } from "@/lib/i18n/navigation";
import {
  createNoteAction,
  deleteNoteAndRedirectAction,
  updateNoteAction,
  type NoteActionResult,
} from "@/lib/actions/notes";
import type { SerializedNote } from "@/lib/repositories/notes";

type NoteEditorFormProps = {
  mode: "create" | "edit";
  note?: SerializedNote | null;
  vehicles: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  existingTags: string[];
  defaultVehicleId?: string;
  defaultTemplateId?: string;
};

export function NoteEditorForm({
  mode,
  note,
  vehicles,
  templates,
  existingTags,
  defaultVehicleId,
  defaultTemplateId,
}: NoteEditorFormProps) {
  const t = useTranslations("notes.editor");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDelete] = useTransition();

  const action = mode === "edit" ? updateNoteAction : createNoteAction;

  const [state, formAction, pending] = useActionState<NoteActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        router.push(`/notes/${result.noteId}`);
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && note ? <input type="hidden" name="noteId" value={note.id} /> : null}

      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      <div className="space-y-2">
        <Label htmlFor="note-title" required>
          {t("title")}
        </Label>
        <Input
          id="note-title"
          name="title"
          required
          maxLength={160}
          defaultValue={note?.title}
          placeholder={t("titlePlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="note-vehicle">{t("vehicle")}</Label>
          <Select
            id="note-vehicle"
            name="vehicleId"
            defaultValue={note?.vehicleId ?? defaultVehicleId ?? ""}
          >
            <option value="">{t("noVehicle")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-template">{t("maintenanceType")}</Label>
          <Select
            id="note-template"
            name="maintenanceTemplateId"
            defaultValue={note?.maintenanceTemplateId ?? defaultTemplateId ?? ""}
          >
            <option value="">{t("noMaintenanceType")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-tags">{t("tags")}</Label>
        <Input
          id="note-tags"
          name="tags"
          list="note-tag-suggestions"
          defaultValue={note?.tags.join(", ")}
          placeholder={t("tagsPlaceholder")}
        />
        <datalist id="note-tag-suggestions">
          {existingTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <p className="text-[11px] text-muted-foreground">{t("tagsHint")}</p>
      </div>

      <label className="flex min-h-[24px] items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isPinned"
          value="true"
          defaultChecked={note?.isPinned}
          className="h-4 w-4 rounded border-border accent-[var(--accent)]"
        />
        {t("pin")}
      </label>

      <div className="space-y-2">
        <Label htmlFor="note-content">{t("content")}</Label>
        <MarkdownEditor
          id="note-content"
          name="content"
          rows={12}
          defaultValue={note?.content}
          placeholder={t("contentPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
        <div>
          {mode === "edit" && note ? (
            <>
              <Button
                type="button"
                variant="danger"
                className="px-3 py-1.5 text-xs"
                onClick={() => setDeleteOpen(true)}
              >
                {t("delete")}
              </Button>
              <Dialog
                open={deleteOpen}
                title={t("deleteTitle")}
                description={t("deleteDescription", { title: note.title })}
                confirmLabel={deletePending ? t("deleting") : t("deleteConfirm")}
                cancelLabel={t("cancel")}
                confirmVariant="danger"
                loading={deletePending}
                onConfirm={() =>
                  startDelete(async () => {
                    await deleteNoteAndRedirectAction(note.id, note.vehicleId);
                  })
                }
                onCancel={() => setDeleteOpen(false)}
              />
            </>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(note ? `/notes/${note.id}` : "/notes")}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
