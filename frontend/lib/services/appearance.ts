import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredFile,
  readStoredFile,
  saveUserBackgroundImage,
} from "@/lib/storage/local";

export async function getBackgroundImageForUser(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { backgroundImageKey: true, backgroundMimeType: true },
  });
  if (!prefs?.backgroundImageKey || !prefs.backgroundMimeType) return null;
  return prefs;
}

export async function userHasBackgroundImage(userId: string): Promise<boolean> {
  const prefs = await getBackgroundImageForUser(userId);
  return prefs != null;
}

export async function readBackgroundImageForCurrentUser() {
  const userId = await getCurrentUserId();
  const prefs = await getBackgroundImageForUser(userId);
  if (!prefs?.backgroundImageKey) return null;

  try {
    const buffer = await readStoredFile(prefs.backgroundImageKey);
    return { buffer, mimeType: prefs.backgroundMimeType! };
  } catch {
    return null;
  }
}

export async function uploadBackgroundImage(file: File) {
  const userId = await getCurrentUserId();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { backgroundImageKey: true },
  });

  const saved = await saveUserBackgroundImage(userId, file);

  if (prefs?.backgroundImageKey && prefs.backgroundImageKey !== saved.storageKey) {
    await deleteStoredFile(prefs.backgroundImageKey).catch(() => undefined);
  }

  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      backgroundImageKey: saved.storageKey,
      backgroundMimeType: saved.mimeType,
    },
    update: {
      backgroundImageKey: saved.storageKey,
      backgroundMimeType: saved.mimeType,
    },
  });
}

export async function removeBackgroundImage() {
  const userId = await getCurrentUserId();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { backgroundImageKey: true },
  });

  if (prefs?.backgroundImageKey) {
    await deleteStoredFile(prefs.backgroundImageKey).catch(() => undefined);
  }

  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {
      backgroundImageKey: null,
      backgroundMimeType: null,
    },
  });
}
