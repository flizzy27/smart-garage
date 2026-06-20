import type { CatalogDataSource, PrismaClient } from "@prisma/client";
import { normalizeCatalogLabel, normalizeManufacturerName } from "@/lib/catalog/normalize";
import type { CardataRow } from "@/lib/catalog/sources/cardata-wiki";

const SOURCE_PRIORITY: Record<CatalogDataSource, number> = {
  CARDATA_WIKI: 3,
  OPEN_VEHICLE_DB: 2,
  NHTSA_VPIC: 1,
  MANUAL: 4,
};

export function manufacturerPriority(source: CatalogDataSource): number {
  return SOURCE_PRIORITY[source] ?? 0;
}

export function dedupeManufacturersByName<
  T extends { id: string; name: string; source: CatalogDataSource },
>(manufacturers: T[]): T[] {
  const byName = new Map<string, T>();

  for (const item of manufacturers) {
    const key = normalizeManufacturerName(item.name);
    const existing = byName.get(key);
    if (
      !existing ||
      manufacturerPriority(item.source) > manufacturerPriority(existing.source)
    ) {
      byName.set(key, item);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function dedupeCardataRows(rows: CardataRow[]): {
  rows: CardataRow[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const deduped: CardataRow[] = [];

  for (const row of rows) {
    const key = cardataRowFingerprint(row);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return {
    rows: deduped,
    duplicatesRemoved: rows.length - deduped.length,
  };
}

export function cardataRowFingerprint(row: CardataRow): string {
  return [
    row.make,
    row.model,
    row.variant,
    row.yearFrom,
    row.yearTo,
    row.drivetrain,
    row.engineDisplacement,
    row.enginePowerKw,
    row.enginePowerBhp,
    row.gearboxType,
    row.gears,
    row.engineFuelType,
  ]
    .map((value) => (value ?? "").trim().toLowerCase())
    .join("|");
}

export async function removeShadowManufacturers(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<number> {
  const log = onProgress ?? (() => {});
  const cardataMakes = await prisma.catalogManufacturer.findMany({
    where: { source: "CARDATA_WIKI" },
    select: { name: true },
  });

  const cardataNames = new Set(
    cardataMakes.map((m) => normalizeManufacturerName(m.name)),
  );

  const shadows = await prisma.catalogManufacturer.findMany({
    where: { source: { in: ["NHTSA_VPIC", "OPEN_VEHICLE_DB"] } },
    select: { id: true, name: true, slug: true, source: true },
  });

  let removed = 0;
  for (const shadow of shadows) {
    if (!cardataNames.has(normalizeManufacturerName(shadow.name))) continue;
    await prisma.catalogManufacturer.delete({ where: { id: shadow.id } });
    log(`  Removed shadow ${shadow.source} entry: ${shadow.name} (${shadow.slug})`);
    removed++;
  }

  return removed;
}

export async function mergeDuplicateSeries(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<number> {
  const log = onProgress ?? (() => {});
  let merged = 0;

  const manufacturers = await prisma.catalogManufacturer.findMany({
    where: { source: "CARDATA_WIKI" },
    select: { id: true, name: true },
  });

  for (const manufacturer of manufacturers) {
    const series = await prisma.catalogSeries.findMany({
      where: { manufacturerId: manufacturer.id },
      orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, typeof series>();
    for (const item of series) {
      const key = normalizeCatalogLabel(item.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    for (const [, items] of groups) {
      if (items.length < 2) continue;
      const [keep, ...dupes] = items;
      for (const dupe of dupes) {
        await mergeSeries(prisma, keep.id, dupe.id);
        merged++;
        log(`  Merged series "${dupe.name}" → "${keep.name}" (${manufacturer.name})`);
      }
    }
  }

  return merged;
}

async function mergeSeries(
  prisma: PrismaClient,
  keepId: string,
  removeId: string,
): Promise<void> {
  const generations = await prisma.catalogGeneration.findMany({
    where: { seriesId: removeId },
  });

  for (const generation of generations) {
    const existing = await prisma.catalogGeneration.findFirst({
      where: {
        seriesId: keepId,
        yearFrom: generation.yearFrom,
        yearTo: generation.yearTo,
      },
    });

    if (existing) {
      await mergeGeneration(prisma, existing.id, generation.id);
    } else {
      await prisma.catalogGeneration.update({
        where: { id: generation.id },
        data: { seriesId: keepId },
      });
    }
  }

  await prisma.catalogSeries.delete({ where: { id: removeId } });
}

async function mergeGeneration(
  prisma: PrismaClient,
  keepId: string,
  removeId: string,
): Promise<void> {
  const variants = await prisma.catalogVariant.findMany({
    where: { generationId: removeId },
  });

  for (const variant of variants) {
    const existing = await prisma.catalogVariant.findFirst({
      where: { generationId: keepId, name: variant.name },
    });

    if (existing) {
      await mergeVariant(prisma, existing.id, variant.id);
    } else {
      await prisma.catalogVariant.update({
        where: { id: variant.id },
        data: { generationId: keepId },
      });
    }
  }

  await prisma.catalogGeneration.delete({ where: { id: removeId } });
}

async function mergeVariant(
  prisma: PrismaClient,
  keepId: string,
  removeId: string,
): Promise<void> {
  const engines = await prisma.catalogEngine.findMany({
    where: { variantId: removeId },
  });

  for (const engine of engines) {
    const existing = await prisma.catalogEngine.findFirst({
      where: { variantId: keepId, name: engine.name },
    });

    if (existing) {
      await prisma.catalogModelYear.updateMany({
        where: { engineId: engine.id },
        data: { engineId: existing.id, variantId: keepId },
      });
      await prisma.catalogEngine.delete({ where: { id: engine.id } });
    } else {
      await prisma.catalogEngine.update({
        where: { id: engine.id },
        data: { variantId: keepId },
      });
      await prisma.catalogModelYear.updateMany({
        where: { engineId: engine.id },
        data: { variantId: keepId },
      });
    }
  }

  await prisma.catalogVariant.delete({ where: { id: removeId } });
}

export async function runCatalogDedup(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<{
  shadowManufacturersRemoved: number;
  seriesMerged: number;
}> {
  const log = onProgress ?? (() => {});
  log("Removing shadow NHTSA/OVD manufacturers…");
  const shadowManufacturersRemoved = await removeShadowManufacturers(prisma, log);

  log("Merging duplicate series/generations/variants/engines…");
  const seriesMerged = await mergeDuplicateSeries(prisma, log);

  return { shadowManufacturersRemoved, seriesMerged };
}
