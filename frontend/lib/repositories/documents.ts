import type { DocumentCategory, DocumentPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SavedFile } from "@/lib/storage/local";

const fileDocumentPurposes: DocumentPurpose[] = [
  "VEHICLE_DOCUMENT",
  "RECEIPT",
  "OTHER",
];

export type SerializedDocument = {
  id: string;
  vehicleId: string | null;
  vehicleName: string | null;
  title: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: DocumentPurpose;
  category: DocumentCategory | null;
  createdAt: string;
  isViewable: boolean;
};

const documentInclude = {
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      licensePlate: true,
      ownerUserId: true,
    },
  },
} as const;

type DocumentRow = Awaited<
  ReturnType<
    typeof prisma.document.findMany<{ include: typeof documentInclude }>
  >
>[number];

function vehicleLabel(
  vehicle: DocumentRow["vehicle"],
): string | null {
  if (!vehicle) return null;
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || vehicle.licensePlate || null;
}

export function serializeDocument(
  document: DocumentRow,
  isViewable: boolean,
): SerializedDocument {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    vehicleName: vehicleLabel(document.vehicle),
    title: document.title,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    sizeBytes: Number(document.sizeBytes),
    purpose: document.purpose,
    category: document.category,
    createdAt: document.createdAt.toISOString(),
    isViewable,
  };
}

export async function createVehicleFileDocument(input: {
  vehicleId: string;
  uploadedByUserId: string;
  file: SavedFile;
  purpose?: DocumentPurpose;
  category?: DocumentCategory | null;
  title?: string | null;
  maintenanceRecordId?: string | null;
}) {
  return prisma.document.create({
    data: {
      vehicleId: input.vehicleId,
      uploadedByUserId: input.uploadedByUserId,
      purpose: input.purpose ?? "VEHICLE_DOCUMENT",
      category: input.category ?? null,
      title: input.title?.trim() || null,
      maintenanceRecordId: input.maintenanceRecordId ?? null,
      originalFilename: input.file.originalFilename,
      storageKey: input.file.storageKey,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.sizeBytes,
    },
  });
}

export async function createVehicleImageDocument(
  vehicleId: string,
  uploadedByUserId: string,
  file: SavedFile,
) {
  return prisma.document.create({
    data: {
      vehicleId,
      uploadedByUserId,
      purpose: "VEHICLE_IMAGE",
      originalFilename: file.originalFilename,
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
  });
}

export async function listFileDocumentsForOwner(
  ownerUserId: string,
  vehicleId?: string,
) {
  return prisma.document.findMany({
    where: {
      deletedAt: null,
      purpose: { in: fileDocumentPurposes },
      vehicle: {
        ownerUserId,
        deletedAt: null,
        ...(vehicleId ? { id: vehicleId } : {}),
      },
    },
    include: documentInclude,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function findDocumentForOwner(documentId: string, ownerUserId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      deletedAt: null,
      OR: [
        {
          vehicle: { ownerUserId, deletedAt: null },
        },
        { uploadedByUserId: ownerUserId },
      ],
    },
    include: documentInclude,
  });
}

export async function findDocumentById(id: string) {
  return prisma.document.findFirst({
    where: { id, deletedAt: null },
  });
}

export async function softDeleteDocument(documentId: string, ownerUserId: string) {
  const document = await findDocumentForOwner(documentId, ownerUserId);
  if (!document) return null;

  return prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });
}

export async function softDeleteVehicleImages(vehicleId: string) {
  return prisma.document.updateMany({
    where: {
      vehicleId,
      purpose: "VEHICLE_IMAGE",
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });
}
