"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import {
  createNoteForCurrentUser,
  deleteNoteForCurrentUser,
  toggleNotePinnedForCurrentUser,
  updateNoteForCurrentUser,
} from "@/lib/services/notes";
import { createNoteSchema, parseTagsInput, updateNoteSchema } from "@/lib/validations/notes";

export type NoteActionResult = {
  ok: boolean;
  error?: string;
  noteId?: string;
};

function revalidateNotePaths(vehicleId?: string | null) {
  revalidatePath("/notes");
  if (vehicleId) {
    revalidatePath(`/vehicles/${vehicleId}`);
  }
}

export async function createNoteAction(
  _prev: NoteActionResult | null,
  formData: FormData,
): Promise<NoteActionResult> {
  try {
    const locale = (await getLocale()) as Locale;
    const parsed = createNoteSchema.parse({
      title: formData.get("title"),
      content: formData.get("content") ?? "",
      vehicleId: formData.get("vehicleId") || undefined,
      maintenanceTemplateId: formData.get("maintenanceTemplateId") || undefined,
      maintenanceRecordId: formData.get("maintenanceRecordId") || undefined,
      isPinned: formData.get("isPinned") || undefined,
      tags: parseTagsInput(formData.get("tags")),
    });

    const note = await createNoteForCurrentUser(parsed, locale);
    revalidateNotePaths(parsed.vehicleId);
    return { ok: true, noteId: note.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

export async function updateNoteAction(
  _prev: NoteActionResult | null,
  formData: FormData,
): Promise<NoteActionResult> {
  try {
    const locale = (await getLocale()) as Locale;
    const parsed = updateNoteSchema.parse({
      noteId: formData.get("noteId"),
      title: formData.get("title"),
      content: formData.get("content") ?? "",
      vehicleId: formData.get("vehicleId") || undefined,
      maintenanceTemplateId: formData.get("maintenanceTemplateId") || undefined,
      maintenanceRecordId: formData.get("maintenanceRecordId") || undefined,
      isPinned: formData.get("isPinned") || undefined,
      tags: parseTagsInput(formData.get("tags")),
    });

    const note = await updateNoteForCurrentUser(parsed, locale);
    revalidateNotePaths(parsed.vehicleId);
    return { ok: true, noteId: note.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

export async function deleteNoteAction(noteId: string, vehicleId?: string | null) {
  try {
    await deleteNoteForCurrentUser(noteId);
    revalidateNotePaths(vehicleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

export async function deleteNoteAndRedirectAction(noteId: string, vehicleId?: string | null) {
  await deleteNoteForCurrentUser(noteId);
  revalidateNotePaths(vehicleId);
  redirect("/notes");
}

export async function toggleNotePinnedAction(noteId: string, vehicleId?: string | null) {
  try {
    await toggleNotePinnedForCurrentUser(noteId);
    revalidateNotePaths(vehicleId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}
