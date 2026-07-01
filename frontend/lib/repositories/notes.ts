import type { Prisma } from "@prisma/client";
import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import type { CreateNoteInput, NoteFiltersInput, UpdateNoteInput } from "@/lib/validations/notes";

const noteInclude = {
  vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
  maintenanceTemplate: { select: { id: true, nameEn: true, nameDe: true, slug: true } },
  maintenanceRecord: { select: { id: true, title: true } },
  tags: { select: { id: true, name: true } },
} satisfies Prisma.NoteInclude;

type NoteRow = Prisma.NoteGetPayload<{ include: typeof noteInclude }>;

export type SerializedNote = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  vehicleId: string | null;
  vehicleName: string | null;
  maintenanceTemplateId: string | null;
  maintenanceTemplateName: string | null;
  maintenanceTemplateSlug: string | null;
  maintenanceRecordId: string | null;
  maintenanceRecordTitle: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export function serializeNote(row: NoteRow, locale: Locale): SerializedNote {
  const vehicleName = row.vehicle
    ? [row.vehicle.make, row.vehicle.model].filter(Boolean).join(" ") ||
      row.vehicle.licensePlate ||
      "Vehicle"
    : null;

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isPinned: row.isPinned,
    vehicleId: row.vehicleId,
    vehicleName,
    maintenanceTemplateId: row.maintenanceTemplateId,
    maintenanceTemplateName: row.maintenanceTemplate
      ? locale === "de"
        ? row.maintenanceTemplate.nameDe
        : row.maintenanceTemplate.nameEn
      : null,
    maintenanceTemplateSlug: row.maintenanceTemplate?.slug ?? null,
    maintenanceRecordId: row.maintenanceRecordId,
    maintenanceRecordTitle: row.maintenanceRecord?.title ?? null,
    tags: row.tags.map((tag) => tag.name).sort((a, b) => a.localeCompare(b)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveTagConnections(ownerUserId: string, tagNames: string[]) {
  const uniqueNames = Array.from(new Set(tagNames.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 0) return [];

  const tags = await Promise.all(
    uniqueNames.map((name) =>
      prisma.noteTag.upsert({
        where: { ownerUserId_name: { ownerUserId, name } },
        create: { ownerUserId, name },
        update: {},
      }),
    ),
  );
  return tags.map((tag) => ({ id: tag.id }));
}

async function assertVehicleOwnership(ownerUserId: string, vehicleId: string | null | undefined) {
  if (!vehicleId) return;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId, deletedAt: null },
    select: { id: true },
  });
  if (!vehicle) throw new Error("Vehicle not found");
}

async function assertRecordOwnership(
  ownerUserId: string,
  maintenanceRecordId: string | null | undefined,
) {
  if (!maintenanceRecordId) return;
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id: maintenanceRecordId, vehicle: { ownerUserId, deletedAt: null } },
    select: { id: true },
  });
  if (!record) throw new Error("Maintenance record not found");
}

export async function createNote(ownerUserId: string, input: CreateNoteInput, locale: Locale) {
  await assertVehicleOwnership(ownerUserId, input.vehicleId);
  await assertRecordOwnership(ownerUserId, input.maintenanceRecordId);
  const tagConnections = await resolveTagConnections(ownerUserId, input.tags);

  const note = await prisma.note.create({
    data: {
      ownerUserId,
      title: input.title.trim(),
      content: input.content ?? "",
      vehicleId: input.vehicleId || null,
      maintenanceTemplateId: input.maintenanceTemplateId || null,
      maintenanceRecordId: input.maintenanceRecordId || null,
      isPinned: input.isPinned ?? false,
      tags: { connect: tagConnections },
    },
    include: noteInclude,
  });

  return serializeNote(note, locale);
}

export async function updateNote(ownerUserId: string, input: UpdateNoteInput, locale: Locale) {
  const existing = await prisma.note.findFirst({
    where: { id: input.noteId, ownerUserId },
  });
  if (!existing) throw new Error("Note not found");

  await assertVehicleOwnership(ownerUserId, input.vehicleId);
  await assertRecordOwnership(ownerUserId, input.maintenanceRecordId);
  const tagConnections = await resolveTagConnections(ownerUserId, input.tags);

  const note = await prisma.note.update({
    where: { id: input.noteId },
    data: {
      title: input.title.trim(),
      content: input.content ?? "",
      vehicleId: input.vehicleId || null,
      maintenanceTemplateId: input.maintenanceTemplateId || null,
      maintenanceRecordId: input.maintenanceRecordId || null,
      isPinned: input.isPinned ?? false,
      tags: { set: tagConnections },
    },
    include: noteInclude,
  });

  return serializeNote(note, locale);
}

export async function deleteNote(ownerUserId: string, noteId: string) {
  const existing = await prisma.note.findFirst({ where: { id: noteId, ownerUserId } });
  if (!existing) throw new Error("Note not found");
  await prisma.note.delete({ where: { id: noteId } });
}

export async function toggleNotePinned(ownerUserId: string, noteId: string) {
  const existing = await prisma.note.findFirst({ where: { id: noteId, ownerUserId } });
  if (!existing) throw new Error("Note not found");
  await prisma.note.update({
    where: { id: noteId },
    data: { isPinned: !existing.isPinned },
  });
}

export async function getNoteForOwner(ownerUserId: string, noteId: string, locale: Locale) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, ownerUserId },
    include: noteInclude,
  });
  if (!note) return null;
  return serializeNote(note, locale);
}

export async function listNotesForOwner(
  ownerUserId: string,
  locale: Locale,
  filters: NoteFiltersInput = {},
) {
  const where: Prisma.NoteWhereInput = { ownerUserId };

  if (filters.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters.pinnedOnly) where.isPinned = true;
  if (filters.tag) where.tags = { some: { name: filters.tag } };
  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [{ title: { contains: search } }, { content: { contains: search } }];
  }

  const notes = await prisma.note.findMany({
    where,
    include: noteInclude,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });

  return notes.map((note) => serializeNote(note, locale));
}

export async function listTagsForOwner(ownerUserId: string) {
  const tags = await prisma.noteTag.findMany({
    where: { ownerUserId },
    orderBy: { name: "asc" },
  });
  return tags.map((tag) => tag.name);
}

export async function countNotesForVehicle(ownerUserId: string, vehicleId: string) {
  return prisma.note.count({ where: { ownerUserId, vehicleId } });
}

export async function listRelatedNotesForVehicle(
  ownerUserId: string,
  vehicleId: string,
  locale: Locale,
  limit = 5,
) {
  const notes = await prisma.note.findMany({
    where: { ownerUserId, vehicleId },
    include: noteInclude,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return notes.map((note) => serializeNote(note, locale));
}

export async function listRelatedNotesForSchedule(
  ownerUserId: string,
  vehicleId: string,
  templateId: string | null,
  locale: Locale,
  limit = 5,
) {
  const where: Prisma.NoteWhereInput = {
    ownerUserId,
    OR: [
      { vehicleId, ...(templateId ? { maintenanceTemplateId: templateId } : {}) },
      { vehicleId, maintenanceTemplateId: null },
      ...(templateId ? [{ vehicleId: null, maintenanceTemplateId: templateId }] : []),
    ],
  };

  const notes = await prisma.note.findMany({
    where,
    include: noteInclude,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return notes.map((note) => serializeNote(note, locale));
}
