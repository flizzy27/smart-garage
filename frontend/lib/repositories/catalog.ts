import { prisma } from "@/lib/prisma";
import { dedupeManufacturersByName } from "@/lib/catalog/dedup-catalog";

type CatalogLevel =
  | "manufacturers"
  | "series"
  | "generations"
  | "variants"
  | "engines"
  | "years";

const LIMITS: Record<CatalogLevel, { default: number; max: number; empty: number }> = {
  manufacturers: { default: 80, max: 300, empty: 300 },
  series: { default: 500, max: 2000, empty: 2000 },
  generations: { default: 200, max: 500, empty: 500 },
  variants: { default: 200, max: 500, empty: 500 },
  engines: { default: 200, max: 500, empty: 500 },
  years: { default: 60, max: 120, empty: 120 },
};

function clampLimit(level: CatalogLevel, limit?: number, hasQuery = false) {
  const config = LIMITS[level];
  if (!limit || limit < 1) {
    return hasQuery ? config.default : config.empty;
  }
  return Math.min(limit, config.max);
}

export async function searchCatalogManufacturers(query: string, limit?: number) {
  const trimmed = query.trim();
  const take = clampLimit("manufacturers", limit, trimmed.length > 0);

  const rows = await prisma.catalogManufacturer.findMany({
    where: trimmed
      ? {
          OR: [
            { name: { contains: trimmed } },
            { slug: { contains: trimmed.toLowerCase().replace(/\s+/g, "-") } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    take: trimmed ? take * 3 : take,
    select: { id: true, name: true, country: true, source: true },
  });

  return dedupeManufacturersByName(rows).slice(0, take);
}

export async function searchCatalogSeries(
  manufacturerId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("series", limit, trimmed.length > 0);

  return prisma.catalogSeries.findMany({
    where: {
      manufacturerId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: { id: true, name: true },
  });
}

export async function searchCatalogGenerations(
  seriesId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("generations", limit, trimmed.length > 0);

  return prisma.catalogGeneration.findMany({
    where: {
      seriesId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: [{ yearFrom: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      code: true,
      yearFrom: true,
      yearTo: true,
    },
  });
}

export async function searchCatalogVariants(
  generationId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("variants", limit, trimmed.length > 0);

  return prisma.catalogVariant.findMany({
    where: {
      generationId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      trim: true,
      bodyType: true,
      driveType: true,
    },
  });
}

export async function searchCatalogEngines(
  variantId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("engines", limit, trimmed.length > 0);

  return prisma.catalogEngine.findMany({
    where: {
      variantId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      code: true,
      displacementCc: true,
      fuelType: true,
      powerKw: true,
      powerPs: true,
      torqueNm: true,
    },
  });
}

export async function searchCatalogYears(
  variantId: string,
  engineId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("years", limit, trimmed.length > 0);
  const yearFilter = trimmed ? Number(trimmed) : null;

  return prisma.catalogModelYear.findMany({
    where: {
      variantId,
      engineId,
      ...(yearFilter && !Number.isNaN(yearFilter) ? { year: yearFilter } : {}),
    },
    orderBy: { year: "desc" },
    take,
    select: { id: true, year: true },
  });
}

export async function findCatalogManufacturerById(id: string) {
  return prisma.catalogManufacturer.findUnique({
    where: { id },
    select: { id: true, name: true, country: true },
  });
}

export async function findCatalogSeriesById(id: string) {
  return prisma.catalogSeries.findUnique({
    where: { id },
    select: { id: true, name: true, manufacturerId: true },
  });
}

export async function findCatalogGenerationById(id: string) {
  return prisma.catalogGeneration.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      seriesId: true,
      yearFrom: true,
      yearTo: true,
    },
  });
}

export async function findCatalogVariantById(id: string) {
  return prisma.catalogVariant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      generationId: true,
      bodyType: true,
      driveType: true,
    },
  });
}

export async function findCatalogEngineById(id: string) {
  return prisma.catalogEngine.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      variantId: true,
      code: true,
      displacementCc: true,
      fuelType: true,
      powerKw: true,
      powerPs: true,
      torqueNm: true,
    },
  });
}

export async function findCatalogModelYearById(id: string) {
  return prisma.catalogModelYear.findUnique({
    where: { id },
    select: { id: true, year: true, variantId: true, engineId: true },
  });
}

export async function getCatalogStats() {
  const [manufacturers, series, modelYears] = await Promise.all([
    prisma.catalogManufacturer.count(),
    prisma.catalogSeries.count(),
    prisma.catalogModelYear.count(),
  ]);
  return { manufacturers, series, modelYears };
}
