import { getCurrentUserId } from "@/lib/auth/current-user";
import type { Locale } from "@/lib/i18n/routing";
import {
  countNotesForVehicle,
  createNote,
  deleteNote,
  getNoteForOwner,
  listNotesForOwner,
  listRelatedNotesForSchedule as listRelatedNotesForScheduleRepo,
  listRelatedNotesForVehicle,
  listTagsForOwner,
  toggleNotePinned,
  updateNote,
} from "@/lib/repositories/notes";
import { prisma } from "@/lib/prisma";
import type { CreateNoteInput, NoteFiltersInput, UpdateNoteInput } from "@/lib/validations/notes";

export async function getNotesPageData(locale: Locale, filters: NoteFiltersInput) {
  const ownerUserId = await getCurrentUserId();
  const [notes, tags, vehicles] = await Promise.all([
    listNotesForOwner(ownerUserId, locale, filters),
    listTagsForOwner(ownerUserId),
    prisma.vehicle.findMany({
      where: { ownerUserId, deletedAt: null },
      select: { id: true, make: true, model: true, licensePlate: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    notes,
    tags,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: [v.make, v.model].filter(Boolean).join(" ") || v.licensePlate || "Vehicle",
    })),
  };
}

export async function getNoteEditorData(locale: Locale, noteId?: string) {
  const ownerUserId = await getCurrentUserId();
  const [vehicles, templates, note] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerUserId, deletedAt: null },
      select: { id: true, make: true, model: true, licensePlate: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.maintenanceTemplate.findMany({
      where: { isSystem: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    noteId ? getNoteForOwner(ownerUserId, noteId, locale) : Promise.resolve(null),
  ]);

  if (noteId && !note) return null;

  return {
    note,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: [v.make, v.model].filter(Boolean).join(" ") || v.licensePlate || "Vehicle",
    })),
    templates: templates.map((t) => ({
      id: t.id,
      name: locale === "de" ? t.nameDe : t.nameEn,
    })),
  };
}

export async function createNoteForCurrentUser(input: CreateNoteInput, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  return createNote(ownerUserId, input, locale);
}

export async function updateNoteForCurrentUser(input: UpdateNoteInput, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  return updateNote(ownerUserId, input, locale);
}

export async function deleteNoteForCurrentUser(noteId: string) {
  const ownerUserId = await getCurrentUserId();
  await deleteNote(ownerUserId, noteId);
}

export async function toggleNotePinnedForCurrentUser(noteId: string) {
  const ownerUserId = await getCurrentUserId();
  await toggleNotePinned(ownerUserId, noteId);
}

export async function getVehicleNotesCount(vehicleId: string) {
  const ownerUserId = await getCurrentUserId();
  return countNotesForVehicle(ownerUserId, vehicleId);
}

export async function getRelatedNotesForVehicle(vehicleId: string, locale: Locale) {
  const ownerUserId = await getCurrentUserId();
  return listRelatedNotesForVehicle(ownerUserId, vehicleId, locale);
}

export async function listRelatedNotesForSchedule(
  vehicleId: string,
  templateId: string | null,
  locale: Locale = "en",
) {
  const ownerUserId = await getCurrentUserId();
  return listRelatedNotesForScheduleRepo(ownerUserId, vehicleId, templateId, locale);
}
